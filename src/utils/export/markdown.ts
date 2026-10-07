/**
 * toBlocks：正文 Markdown → Block AST（api-contract §4）。
 *
 * 管线与站点完全同源：@astrojs/markdown-remark 的 unified() + 站点四个 remark
 * 插件 + rehypeExternalLinks + 同一套 Shiki 双主题配置（research.md §7 噪声案 2：
 * 必须复用站点管线形态，独立 renderer 的语言加载行为才有保证）。
 *
 * 结构提取走 MDAST 双快照：
 * - captureBefore（置于用户插件前）克隆全部段落节点 → parse*Card 只认段落；
 * - captureAfter（置于用户插件后）克隆最终树 → 指令段落已原地降级为 html 节点，
 *   两棵树段落顺序一致（removeTocMarker 只删标题节点），按位置对齐：
 *   html 节点 ←→ 前树同位置段落 parse*Card 命中即指令块，未命中为真原生 HTML → unknown。
 * - 代码块 tokens 从渲染 HTML 的 <pre><code> 解析（shiki 输出结构规整，见 dist 实测）；
 *   fileName 徽章在 <pre> 层级，天然不混入 tokens；配色表全局累计、由 manifest 下发。
 * - heading id / slug 取自 renderer metadata.headings（Astro 权威集合，按文档序对齐）。
 * - linkcard 站内链走本地 frontmatter TDK（禁联网，D44/research §7）；外链只填
 *   作者手写标题/备注。
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { unified, type ShikiConfig } from "@astrojs/markdown-remark";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "../transformers/fileName";
import { remarkRemoveTocMarker } from "../remarkRemoveTocMarker";
import { rehypeExternalLinks } from "../rehypeExternalLinks";
import { cachedTrack } from "../music";
import { parseLinkCard, remarkLinkCard } from "../remarkLinkCard";
import { parseMusicCard, remarkMusic } from "../remarkMusic";
import { parseVideoCard, remarkVideo } from "../remarkVideo";
import { isInternalUrl, warnBuild } from "./base";
import type { Block, CodeToken, Inline, TocItem } from "./types";

/* ── 轻量 mdast 结构（与插件侧同款，不引入 mdast 依赖）──────────── */
type MdNode = {
  type?: string;
  value?: string;
  depth?: number;
  lang?: string;
  meta?: string | null;
  url?: string;
  alt?: string | null;
  ordered?: boolean;
  children?: MdNode[];
};

export interface CodeColors {
  light: string;
  dark: string;
}

/* ── Shiki 双主题配置：与 astro.config.ts 逐项一致 ────────────────── */
type ShikiTransformer = NonNullable<ShikiConfig["transformers"]>[number];
const shikiConfig: ShikiConfig = {
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false,
  wrap: false,
  transformers: [
    transformerFileName({ style: "v2", hideDot: false }) as ShikiTransformer,
    transformerNotationHighlight() as ShikiTransformer,
    transformerNotationWordHighlight() as ShikiTransformer,
    transformerNotationDiff({ matchAlgorithm: "v3" }) as ShikiTransformer,
  ],
};

interface RendererResult {
  code: string;
  metadata: { headings: { depth: number; slug: string; text: string }[] };
}

interface SiteRenderer {
  render: (content: string, opts?: { fileURL?: URL }) => Promise<RendererResult>;
}

let rendererPromise: Promise<SiteRenderer> | null = null;
const state = {
  beforeParagraphs: [] as MdNode[],
  root: null as MdNode | null,
};

async function getRenderer(): Promise<SiteRenderer> {
  if (!rendererPromise) {
    // 捕获插件以 never 入参声明（contravariance 兼容 unified 的 Plugin 签名），
    // 内部还原为本文件的轻量 MdNode 结构
    const captureBefore = () => (tree: unknown) => {
      const walk = (node: MdNode) => {
        if (node.type === "paragraph") state.beforeParagraphs.push(structuredClone(node));
        for (const child of node.children ?? []) walk(child);
      };
      walk(tree as MdNode);
    };
    const captureAfter = () => (tree: unknown) => {
      state.root = structuredClone(tree as MdNode);
    };
    rendererPromise = unified({
      remarkPlugins: [
        captureBefore,
        remarkRemoveTocMarker,
        remarkLinkCard,
        remarkMusic,
        remarkVideo,
        captureAfter,
      ],
      rehypePlugins: [rehypeExternalLinks],
    })
      .createRenderer({ syntaxHighlight: "shiki", shikiConfig })
      .then(r => ({ render: (content, opts) => r.render(content, opts) }));
  }
  return rendererPromise;
}

/* ── HTML 实体解码（shiki token 文本）─────────────────────────────── */
function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/* ── shiki token 解析 + 全局配色表 ────────────────────────────────── */

const globalColors: CodeColors[] = [];
const globalColorIndex = new Map<string, number>();

function colorIndex(style: string): number | undefined {
  const light = /--shiki-light:#([0-9a-fA-F]{3,8})/.exec(style)?.[1];
  const dark = /--shiki-dark:#([0-9a-fA-F]{3,8})/.exec(style)?.[1];
  if (!light && !dark) return undefined;
  const key = `${light ?? ""}|${dark ?? ""}`;
  let idx = globalColorIndex.get(key);
  if (idx === undefined) {
    idx = globalColors.length;
    globalColorIndex.set(key, idx);
    globalColors.push({ light: light ?? "", dark: dark ?? "" });
  }
  return idx;
}

/** manifest 下发的配色表（须在全部文章渲染完成后读取） */
export function codeColors(): CodeColors[] {
  return globalColors;
}

interface PreBlock {
  lang: string;
  lines: CodeToken[][];
}

function parsePreBlocks(html: string): PreBlock[] {
  const pres: PreBlock[] = [];
  // file= 徽章 span 会被 transformerFileName 插在 </code> 与 </pre> 之间，
  // 因此 code 内层与 </pre> 之间允许有其它内容（group 3，丢弃）
  const preRe = /<pre([^>]*)><code>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/g;
  let preMatch: RegExpExecArray | null;
  while ((preMatch = preRe.exec(html))) {
    const langFromAttr = /data-language="([^"]*)"/.exec(preMatch[1])?.[1] ?? "";
    const inner = preMatch[2];
    const lines: CodeToken[][] = [];
    /* 行切分不能用 /<span class="line">([\s\S]*?)<\/span>/：非贪婪会在行内第一个 token 的
     * </span> 就收口，于是 token 正则永远匹配不到完整 span（实测 178 行 → 0 token），
     * 整行文本被截成第一个 token —— 一篇 17 块的文档只留下约 30% 字符，颜色索引也一起丢光。
     * 行内只有一层 token span，所以按「行开标签」切段、每段末尾那个 </span> 正是行自身的闭合。
     * 开标签要容许附加 class：notationHighlight/diff 转换器会写 class="line highlight"。 */
    for (const chunk of inner.split(/<span class="line[^"]*">/).slice(1)) {
      const lineHtml = chunk.replace(/<\/span>\s*$/, "");
      const tokens: CodeToken[] = [];
      const tokenRe = /<span style="([^"]*)">([\s\S]*?)<\/span>/g;
      let tokenMatch: RegExpExecArray | null;
      let anySpan = false;
      while ((tokenMatch = tokenRe.exec(lineHtml))) {
        anySpan = true;
        const v = decodeEntities(tokenMatch[2]);
        if (v === "") continue;
        tokens.push({ v, c: colorIndex(tokenMatch[1]) });
      }
      if (!anySpan) {
        const raw = decodeEntities(lineHtml.replace(/<[^>]+>/g, ""));
        if (raw) tokens.push({ v: raw });
      }
      lines.push(tokens);
    }
    if (lines.length === 0 && inner.trim()) {
      const raw = decodeEntities(inner.replace(/<[^>]+>/g, ""));
      if (raw) lines.push([{ v: raw }]);
    }
    pres.push({ lang: langFromAttr, lines });
  }
  return pres;
}

/* ── linkcard 站内 TDK（本地 frontmatter，禁联网）─────────────────── */

const rawBlog = import.meta.glob<string>("/src/data/blog/**/[^_]*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const rawGalleries = import.meta.glob<string>("/src/data/galleries/**/index.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

function extractYaml(fm: string, key: string): string | undefined {
  const match = new RegExp(`^${key}\\s*:\\s*(.*)$`, "m").exec(fm);
  if (!match) return undefined;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || undefined;
}

interface LocalTdk {
  title?: string;
  description?: string;
  draft?: string;
}

const localTdkMap = (() => {
  const map = new Map<string, LocalTdk>();
  const collect = (entries: Record<string, string>, prefix: string) => {
    for (const [absPath, raw] of Object.entries(entries)) {
      const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      if (!fmMatch) continue;
      const rel = absPath
        .replace(/^\/src\/data\/(blog|galleries)\//, "")
        .replace(/\.(md|mdx)$/i, "");
      const slug = rel.replace(/\/index$/i, "");
      map.set(`${prefix}/${slug}`, {
        title: extractYaml(fmMatch[1], "title"),
        description: extractYaml(fmMatch[1], "description"),
        draft: extractYaml(fmMatch[1], "draft"),
      });
    }
  };
  collect(rawBlog, "/posts");
  collect(rawGalleries, "/galleries");
  return map;
})();

function normalizeInternalPath(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function linkCardBlock(before: MdNode): Block | null {
  const card = parseLinkCard(before);
  if (!card) return null;
  const { url, note, overrideTitle, overrideDescription } = card;
  const internal = isInternalUrl(url);
  const tdk = internal ? localTdkMap.get(normalizeInternalPath(url)) : undefined;
  const title =
    overrideTitle ?? (tdk?.draft === "true" ? undefined : tdk?.title) ?? note ?? getDomain(url);
  const desc =
    overrideDescription ??
    (tdk?.draft === "true" ? undefined : tdk?.description) ??
    (note && title !== note ? note : undefined);
  const icon =
    internal && url.startsWith("/posts/") ? `${normalizeInternalPath(url)}/index.png` : undefined;
  return {
    t: "linkcard",
    href: url,
    title,
    ...(desc ? { desc } : {}),
    ...(icon ? { icon } : {}),
  };
}

/* ── Inline 构建 ──────────────────────────────────────────────────── */

interface InlineFlags {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  link?: { href: string; external: boolean };
}

function buildInline(
  nodes: MdNode[],
  flags: InlineFlags,
  onImage: (node: MdNode) => void
): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        if (node.value) out.push({ t: "text", v: node.value, ...flags });
        break;
      case "strong":
        out.push(...buildInline(node.children ?? [], { ...flags, bold: true }, onImage));
        break;
      case "emphasis":
        out.push(...buildInline(node.children ?? [], { ...flags, italic: true }, onImage));
        break;
      case "delete":
        out.push(...buildInline(node.children ?? [], { ...flags, strike: true }, onImage));
        break;
      case "inlineCode":
        if (node.value) out.push({ t: "code", v: node.value, ...flags });
        break;
      case "break":
        out.push({ t: "br", v: "" });
        break;
      case "link": {
        const href = node.url ?? "";
        const linkFlags: InlineFlags = {
          ...flags,
          link: { href, external: !isInternalUrl(href) },
        };
        out.push(...buildInline(node.children ?? [], linkFlags, onImage));
        break;
      }
      case "image":
        onImage(node);
        break;
      default:
        if (node.children?.length) {
          out.push(...buildInline(node.children, flags, onImage));
        } else if (node.value && node.type !== "html") {
          out.push({ t: "text", v: node.value, ...flags });
        }
        break;
    }
  }
  return out;
}

/* ── toBlocks 主流程 ──────────────────────────────────────────────── */

export interface ToBlocksResult {
  blocks: Block[];
  toc: TocItem[];
  assets: number;
  unknownCount: number;
  headings: string[];
}

export type ResolveImage = (globKey: string) => Promise<number>;

/**
 * @param markdown 正文（可含 frontmatter，函数内剥离）
 * @param filePath 源文件相对路径（src/data/blog/...，用于 fileURL 与图片解析）
 * @param resolveImage 相对图片 → assets 下标（由调用方绑定 toAssetRef 与清单）
 */
export async function toBlocks(
  markdown: string,
  filePath: string,
  resolveImage: ResolveImage
): Promise<ToBlocksResult> {
  const renderer = await getRenderer();
  const md = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  state.beforeParagraphs = [];
  state.root = null;

  const result = await renderer.render(md, {
    fileURL: pathToFileURL(join(process.cwd(), filePath)),
  });
  const root = state.root as MdNode | null;
  if (!root) throw new Error("[mp-export] markdown 渲染未捕获 AST（captureAfter 未执行）");

  const headings = result.metadata.headings ?? [];
  const pres = parsePreBlocks(result.code);

  const blocks: Block[] = [];
  const toc: TocItem[] = [];
  let assets = 0;
  let unknownCount = 0;
  let headingCursor = 0;
  let preCursor = 0;
  let paragraphCursor = 0;

  // 目录相对 blog 根（剥 src/data/blog/ 前缀），如 n8wq4r7t
  const dir = filePath
    .replace(/^src\/data\/blog\//, "")
    .split("/")
    .slice(0, -1)
    .join("/");
  const pushImageBlock = async (node: MdNode) => {
    // remark-collect-images 会把相对 url 改写为 src-root 相对路径（有无前导 / 不一）；
    // 未改写时（./xx）按源文件目录拼装；远程图片无本地变体 → unknown 兜底
    const raw = node.url ?? "";
    if (/^https?:\/\//i.test(raw)) {
      unknownCount++;
      warnBuild(`${filePath} 远程图片走 unknown 兜底：${raw.slice(0, 60)}`);
      blocks.push({ t: "unknown", raw });
      return;
    }
    const inData = raw.indexOf("src/data/");
    const globKey =
      inData >= 0
        ? `/${raw.slice(inData)}`
        : `/src/data/blog/${dir ? `${dir}/` : ""}${raw.split("/").pop() ?? ""}`;
    try {
      const index = await resolveImage(globKey);
      assets++;
      blocks.push({ t: "img", a: index, ...(node.alt ? { alt: node.alt } : {}) });
    } catch (error) {
      unknownCount++;
      warnBuild(`${filePath} 图片解析失败 ${raw}：${String(error)}`);
      blocks.push({ t: "unknown", raw });
    }
  };

  const directiveBlockFor = (before: MdNode): Block | null => {
    const card = linkCardBlock(before);
    if (card) return card;
    const music = parseMusicCard(before);
    if (music) {
      // 站点卡片的歌名/歌手/封面来自构建期 resolveTrack（remarkMusic），端上拿不到
      // 那层，故由导出层同源下发；用纯离线的 cachedTrack 查 music-cache.json，
      // 未命中就留空（导出层禁联网，同 fetchTdk 那条口径），端上降级为「曲库 ID」。
      const track = cachedTrack(music.id, music.platform);
      return {
        t: "music",
        platform: music.platform,
        id: music.id,
        ...(music.audio ? { audio: music.audio } : {}),
        ...(track?.name ? { name: track.name } : {}),
        ...(track?.artist ? { artist: track.artist } : {}),
        ...(track?.cover ? { cover: track.cover } : {}),
      };
    }
    const video = parseVideoCard(before);
    if (video) {
      // 非 B 站 id（无 src 时）离线降级为跳转卡片；B 站链接尽量提取 BV 号
      if (video.id && !video.src && !/BV[0-9A-Za-z]+/.test(video.id) && !/b23\.tv/.test(video.id)) {
        return { t: "linkcard", href: video.id, title: video.title ?? video.id };
      }
      const bv = video.id?.match(/BV[0-9A-Za-z]+/)?.[0];
      return {
        t: "video",
        ...(bv ? { id: bv } : video.id ? { id: video.id } : {}),
        ...(video.src ? { src: video.src } : {}),
        ...(video.poster ? { poster: video.poster } : {}),
        ...(video.title ? { title: video.title } : {}),
        ...(video.ratio ? { ratio: video.ratio } : {}),
      };
    }
    return null;
  };

  const list_children = (list: MdNode): MdNode[][] =>
    (list.children ?? []).map(item => item.children ?? []);

  const visit = async (node: MdNode): Promise<void> => {
    switch (node.type) {
      case "paragraph": {
        const before = state.beforeParagraphs[paragraphCursor];
        paragraphCursor++;
        const directive = before ? directiveBlockFor(before) : null;
        if (directive) {
          blocks.push(directive);
          return;
        }
        const images: MdNode[] = [];
        const inline = buildInline(node.children ?? [], {}, img => images.push(img));
        if (inline.length > 0) blocks.push({ t: "p", i: inline });
        for (const img of images) await pushImageBlock(img);
        return;
      }
      case "heading": {
        const meta = headings[headingCursor++];
        const depth = node.depth ?? 99;
        if ((depth === 2 || depth === 3 || depth === 4) && meta) {
          const i = buildInline(node.children ?? [], {}, () => {});
          blocks.push({ t: "h", d: depth, i, id: meta.slug });
          toc.push({ id: meta.slug, text: meta.text, depth });
        }
        return;
      }
      case "code": {
        const pre = pres[preCursor++];
        if (!pre) throw new Error(`[mp-export] ${filePath} 代码块 HTML 与 AST 数量不齐（shiki 管线漂移）`);
        const meta = node.meta ?? "";
        const file = /(?:^|\s)file=(?:"([^"]*)"|(\S+))/.exec(meta)?.[1];
        const lang = node.lang ?? pre.lang;
        blocks.push({
          t: "code",
          ...(lang ? { lang } : {}),
          ...(file ? { file } : {}),
          lines: pre.lines.length,
          tokens: pre.lines,
          highlighted: true,
        });
        return;
      }
      case "blockquote": {
        const i: Inline[] = [];
        const deferred: MdNode[] = [];
        for (const child of node.children ?? []) {
          if (child.type === "paragraph") {
            paragraphCursor++; // 同步快照游标（captureBefore 递归收集段落）
            i.push(...buildInline(child.children ?? [], {}, () => {}));
          } else {
            deferred.push(child);
          }
        }
        blocks.push({ t: "quote", i });
        for (const child of deferred) await visit(child);
        return;
      }
      case "list": {
        const deferred: MdNode[] = [];
        const items: Inline[][] = [];
        for (const item of list_children(node)) {
          const i: Inline[] = [];
          for (const child of item) {
            if (child.type === "paragraph") {
              paragraphCursor++; // 同步快照游标（captureBefore 递归收集段落）
            i.push(...buildInline(child.children ?? [], {}, () => {}));
            } else {
              deferred.push(child);
            }
          }
          items.push(i);
        }
        blocks.push({ t: "list", ordered: Boolean(node.ordered), items });
        // 列表项内嵌的代码块等块级节点：在列表块之后按文档序补出
        for (const child of deferred) await visit(child);
        return;
      }
      case "table": {
        const rows = node.children ?? [];
        const cells = (row: MdNode) =>
          (row.children ?? []).map(c => buildInline(c.children ?? [], {}, () => {}));
        blocks.push({
          t: "table",
          head: rows[0] ? cells(rows[0]) : [],
          rows: rows.slice(1).map(cells),
        });
        return;
      }
      case "thematicBreak":
        blocks.push({ t: "hr" });
        return;
      case "html": {
        // 指令段落在此已降级为 html —— 与前树同位置的段落做 parse 判定
        const before = state.beforeParagraphs[paragraphCursor];
        if (before) {
          const directive = directiveBlockFor(before);
          paragraphCursor++;
          if (directive) {
            blocks.push(directive);
            return;
          }
        }
        const raw = node.value ?? "";
        if (raw.trim()) {
          unknownCount++;
          warnBuild(`${filePath} 未识别 HTML/JSX 节点：${raw.slice(0, 60)}…`);
          blocks.push({ t: "unknown", raw });
        }
        return;
      }
      case "definition":
        // 纯元数据节点，不渲染
        return;
      default: {
        const children = node.children as MdNode[] | undefined;
        if (children?.length) {
          for (const child of children) await visit(child);
          return;
        }
        const text = node.value ?? "";
        if (text.trim()) {
          unknownCount++;
          warnBuild(`${filePath} 未识别节点 ${node.type}：${text.slice(0, 60)}`);
          blocks.push({ t: "unknown", raw: text });
        }
        return;
      }
    }
  };

  for (const child of root.children ?? []) await visit(child);

  if (preCursor !== pres.length) {
    throw new Error(
      `[mp-export] ${filePath} 代码块解析数不齐：AST ${preCursor} vs HTML ${pres.length}`
    );
  }

  return {
    blocks,
    toc,
    assets,
    unknownCount,
    headings: toc.map(t => t.text),
  };
}

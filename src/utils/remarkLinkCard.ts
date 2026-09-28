/**
 * remark plugin: 将 `::link-card[...]` 指令渲染为链接卡片（Link Card）。
 *
 * 语法（必须独立成段，整段只包含指令，可带空行分隔）：
 *
 *   ::link-card[URL]
 *   ::link-card[URL 说明文字]
 *   ::link-card[URL] title="覆盖标题" description="覆盖描述"
 *
 * 说明：
 * - URL 支持站内链接（`/` 开头或本站域名）与第三方外链（http/https）。
 * - 站内链接：从本地内容集合（blog / galleries）的 frontmatter 解析 TDK，
 *   不发网络请求；draft 文章不参与解析。
 * - 外部链接：构建期 fetch 抓取 TDK（og:title / og:description 优先，
 *   回退到 <title> 与 meta description），带浏览器 UA、5s 超时、
 *   同一次构建内按 URL 去重缓存、响应截断 512KB。
 * - 封面图：外链抓取 og:image（含 secure_url / twitter:image 兜底），
 *   站内 blog 链接复用动态 OG 图（/posts/<slug>/index.png）；有图时
 *   显示在标题左侧，直接用远程链接（不下载到本地），无图则按无图渲染。
 * - 抓取失败或字段缺失时降级为「域名 + URL」卡片，绝不影响构建。
 * - 字段优先级：显式 title/description 覆盖 > 抓取/本地 TDK >
 *   说明文字 > 域名。
 * - 兼容性：remark-gfm 会把外链 URL 解析成 link 节点、remark-smartypants
 *   会把属性引号转成弯引号，本插件按节点后代文本拼接并对引号做兼容，
 *   因此无需作者做任何转义。
 * - 卡片样式见 src/styles/typography.css 的 .link-card-* 规则。
 * - parseLinkCard 导出给小程序导出层旁路复用同一解析（M0-0 探针 B，纯解析不联网）。
 */
import { SITE } from "../config";

/* ── 轻量 mdast 类型（不引入 mdast 依赖） ─────────────────────────── */
export type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
};

type MdRoot = {
  children?: MdNode[];
};

/* ── 卡片数据 ─────────────────────────────────────────────────────── */
export type Tdk = {
  title?: string;
  description?: string;
  keywords?: string;
  /** 社交封面图（og:image / twitter:image）的绝对 URL，缺失则无图 */
  image?: string;
};

/** 卡片构建入参（remarkVideo 的降级卡片复用 buildCardHtml 时使用） */
export type LinkCardData = {
  url: string;
  note?: string;
  overrideTitle?: string;
  overrideDescription?: string;
};

type CardRequest = LinkCardData & {
  node: MdNode;
};

/* ── 常量 ─────────────────────────────────────────────────────────── */
const DIRECTIVE_RE = /^::link-card\s*\[([^\]]+)\]([\s\S]*)$/;
const FETCH_TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* ── 模块级缓存（dev 热更新 / 多次构建复用） ───────────────────────── */
const tdkCache = new Map<string, Tdk | null>();

/* ── URL 判定与规范化 ─────────────────────────────────────────────── */
function isInternalLink(raw: string): boolean {
  if (raw.startsWith("/")) return true;
  try {
    const siteHost = new URL(SITE.website).hostname;
    return new URL(raw).hostname === siteHost;
  } catch {
    return false;
  }
}

/** 站内路径规范化：去掉 query / hash / 尾部斜杠，如 /posts/abc/ → /posts/abc */
function normalizePath(raw: string): string {
  const clean = raw.split(/[?#]/)[0];
  if (!clean.startsWith("/")) {
    try {
      return new URL(clean).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return clean;
    }
  }
  return clean.replace(/\/+$/, "") || "/";
}

function getDomain(raw: string): string {
  try {
    const absolute = raw.startsWith("/")
      ? `${SITE.website}${raw.replace(/^\/+/, "")}`
      : raw;
    return new URL(absolute).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function isUsableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

/* ── 指令解析 ─────────────────────────────────────────────────────── */
function splitUrlAndNote(raw: string): { url: string; note?: string } {
  const trimmed = raw.trim();
  const space = trimmed.search(/\s/);
  if (space === -1) return { url: trimmed };
  const note = trimmed.slice(space + 1).trim();
  return { url: trimmed.slice(0, space), note: note || undefined };
}

/**
 * 属性覆盖参数：title="…" / description="…"。
 * 引号兼容直引号与 remark-smartypants 转换后的弯引号。
 */
const ATTR_QUOTES = `["'“”‘’]`;
const ATTR_PAIR_RE = new RegExp(
  `${ATTR_QUOTES}([^"'“”‘’]*)${ATTR_QUOTES}`,
  "i"
);

function extractAttr(attrs: string, key: string): string | undefined {
  const pattern = new RegExp(
    `(?:^|\\s)${key}\\s*=\\s*${ATTR_PAIR_RE.source}`,
    "i"
  );
  const match = pattern.exec(attrs);
  const value = match?.[1]?.trim();
  return value || undefined;
}

/** 属性段只能由零个或 title/description 覆盖对组成，防止吞掉段落里的其他文字 */
const ATTRS_ONLY_RE = new RegExp(
  `^(?:title|description)\\s*=\\s*${ATTR_PAIR_RE.source}` +
    `(?:\\s+(?:title|description)\\s*=\\s*${ATTR_PAIR_RE.source})?$`,
  "i"
);

/** 拼接节点及其后代的全部文本（GFM autolink 会把 URL 拆成 link 节点） */
function collectText(node: MdNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(collectText).join("");
}

/**
 * 判定一个段落节点是否为 `::link-card[...]` 指令，是则返回结构化卡片数据，
 * 否则返回 null。插件本体与小程序导出层共用同一实现（M0-0 探针 B 抽出），
 * 保证端上拿到的数据与站点渲染永远同源。注意：本函数只做纯解析，
 * 不发任何网络请求（外链 TDK 抓取仍只发生在插件本体）。
 */
export function parseLinkCard(node: MdNode): LinkCardData | null {
  if (node.type !== "paragraph" || !node.children) return null;
  // 拼接整段文本（GFM autolink 会把 URL 拆成 link 节点，需递归取文本）
  const text = node.children
    .map(child => collectText(child))
    .join("")
    .trim();
  const match = DIRECTIVE_RE.exec(text);
  if (!match) return null;
  const attrs = match[2]?.trim() ?? "";
  // 属性段只允许 title/description 覆盖，避免吞掉段落里误混的其他文字
  if (attrs && !ATTRS_ONLY_RE.test(attrs)) return null;
  const { url, note } = splitUrlAndNote(match[1]);
  if (!isUsableUrl(url)) return null;
  return {
    url,
    note,
    overrideTitle: extractAttr(attrs, "title"),
    overrideDescription: extractAttr(attrs, "description"),
  };
}

/* ── HTML 实体处理 ────────────────────────────────────────────────── */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (full, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    }
    return HTML_ENTITIES[lower] ?? full;
  });
}

/** 抓取到的第三方内容在嵌入自身 HTML 前必须转义，防止注入 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── TDK 抓取（外链，构建期） ─────────────────────────────────────── */
/** 相对图片地址基于被抓取页面的 URL 解析为绝对地址 */
function resolveUrl(raw: string, base: string): string | undefined {
  try {
    return new URL(raw, base).href;
  } catch {
    return undefined;
  }
}

function parseTdk(html: string, pageUrl: string): Tdk | null {
  const metas = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (name && content !== undefined) {
      metas.set(name.toLowerCase(), decodeEntities(content.trim()));
    }
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title =
    metas.get("og:title") ??
    (titleTag ? decodeEntities(titleTag[1].trim()) : undefined);
  const description = metas.get("og:description") ?? metas.get("description");
  const keywords = metas.get("keywords");
  const rawImage =
    metas.get("og:image:secure_url") ??
    metas.get("og:image") ??
    metas.get("twitter:image") ??
    metas.get("twitter:image:src");
  const image = rawImage ? resolveUrl(rawImage, pageUrl) : undefined;
  if (!title && !description && !image) return null;
  return { title: title || undefined, description, keywords, image };
}

export async function fetchTdk(url: string): Promise<Tdk | null> {
  const cached = tdkCache.get(url);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      tdkCache.set(url, null);
      return null;
    }
    // 只解析前 512KB：title / meta 都位于 <head>，截断可避免大页面拖慢构建
    const html = (await res.text()).slice(0, 512 * 1024);
    const tdk = parseTdk(html, url);
    tdkCache.set(url, tdk);
    return tdk;
  } catch {
    tdkCache.set(url, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── 站内 TDK（本地内容集合 frontmatter，构建期一次性收集） ────────── */
const rawPosts = import.meta.glob<string>("/src/data/blog/**/[^_]*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

const rawGalleries = import.meta.glob<string>(
  "/src/data/galleries/**/index.{md,mdx}",
  {
    query: "?raw",
    import: "default",
    eager: true,
  }
);

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

function parseFrontmatterTdk(raw: string): Tdk | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return undefined;
  const fm = match[1];
  if (extractYaml(fm, "draft") === "true") return undefined;
  const title = extractYaml(fm, "title");
  const description = extractYaml(fm, "description");
  if (!title && !description) return undefined;
  return { title, description };
}

/**
 * 从 import.meta.glob 的绝对路径推导 slug 并组装站内 TDK 映射。
 * 路径形如 /src/data/blog/<slug>.md 或 /src/data/blog/<slug>/index.md，
 * slug 保留相对目录段（如 sub/foo），与 /posts/<slug>/ 路由一致。
 * blog 站内链接的封面图复用动态 OG 图（/posts/<slug>/index.png），
 * 与 PostDetails 的 SITE.dynamicOgImage 逻辑保持一致；画廊无专属 OG 图，
 * 不设 image（走无图降级）。
 */
function buildLocalTdkMap(): Map<string, Tdk> {
  const map = new Map<string, Tdk>();
  const collect = (
    entries: Record<string, string>,
    prefix: string,
    withImage: boolean
  ) => {
    for (const [absPath, raw] of Object.entries(entries)) {
      const rel = absPath
        .replace(/^\/src\/data\/(blog|galleries)\//, "")
        .replace(/\.(md|mdx)$/i, "");
      const slug = rel.replace(/\/index$/i, "");
      const tdk = parseFrontmatterTdk(raw);
      if (tdk) {
        map.set(`${prefix}/${slug}`, {
          ...tdk,
          ...(withImage ? { image: `${prefix}/${slug}/index.png` } : {}),
        });
      }
    }
  };
  collect(rawPosts, "/posts", true);
  collect(rawGalleries, "/galleries", false);
  return map;
}

/* ── 卡片 HTML 生成 ───────────────────────────────────────────────── */
const ARROW_SVG =
  '<svg class="link-card-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" ' +
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<line x1="7" y1="17" x2="17" y2="7"></line>' +
  '<polyline points="7 7 17 7 17 17"></polyline></svg>';

export function buildCardHtml(
  card: LinkCardData,
  tdk: Tdk | undefined
): string {
  const { url, note, overrideTitle, overrideDescription } = card;
  const internal = isInternalLink(url);
  const domain = escapeHtml(getDomain(url));
  const title = overrideTitle ?? tdk?.title ?? note ?? domain;
  const desc =
    overrideDescription ??
    tdk?.description ??
    (note && title !== note ? note : undefined) ??
    "";
  const fallback = !tdk && !overrideTitle && !note && !overrideDescription;

  const rel = internal ? "" : ' target="_blank" rel="noopener noreferrer"';
  const keywordsAttr = tdk?.keywords
    ? ` data-keywords="${escapeHtml(tdk.keywords)}"`
    : "";
  // 有 og/twitter 封面图时，把图放在标题左侧（直接用远程链接，不下载到本地）
  const image = tdk?.image ? escapeHtml(tdk.image) : undefined;
  const thumb = image
    ? `<img class="link-card-thumb" src="${image}" alt="" loading="lazy" decoding="async" />`
    : "";

  return (
    `<div class="link-card not-prose"${keywordsAttr}>` +
    `<a class="link-card-anchor" href="${escapeHtml(url)}"${rel}>` +
    thumb +
    '<span class="link-card-body">' +
    `<span class="link-card-domain">${domain}</span>` +
    `<span class="link-card-title">${escapeHtml(title)}</span>` +
    (desc ? `<span class="link-card-desc">${escapeHtml(desc)}</span>` : "") +
    (fallback ? `<span class="link-card-url">${escapeHtml(url)}</span>` : "") +
    "</span>" +
    ARROW_SVG +
    "</a>" +
    "</div>"
  );
}

/* ── 插件主入口：parse → TDK → buildCardHtml ─────────────────────── */
export function remarkLinkCard() {
  return async (tree: MdRoot) => {
    const requests: CardRequest[] = [];

    const collect = (node: MdNode) => {
      const data = parseLinkCard(node);
      if (data) requests.push({ node, ...data });
    };

    const walk = (node: MdNode) => {
      collect(node);
      for (const child of node.children ?? []) walk(child);
    };
    for (const child of tree.children ?? []) walk(child);

    if (requests.length === 0) return;

    // 外链统一并行抓取（去重）
    const externalUrls = [
      ...new Set(requests.filter(r => !isInternalLink(r.url)).map(r => r.url)),
    ];
    const fetched = await Promise.all(
      externalUrls.map(async url => [url, await fetchTdk(url)] as const)
    );
    const tdkByUrl = new Map<string, Tdk | null>(fetched);

    // 站内链用本地 frontmatter 映射，不发请求
    const localMap = buildLocalTdkMap();

    for (const req of requests) {
      const tdk = isInternalLink(req.url)
        ? localMap.get(normalizePath(req.url))
        : (tdkByUrl.get(req.url) ?? undefined);
      req.node.type = "html";
      req.node.value = buildCardHtml(req, tdk);
      delete req.node.children;
    }
  };
}

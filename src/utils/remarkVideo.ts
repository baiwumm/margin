/**
 * remarkVideo — 将 Markdown 中的 `::video{...}` 指令渲染为视频卡片。
 *
 * 语法（必须独立成段，整段只包含指令）：
 *
 *   ::video{src=https://example.com/demo.mp4}
 *   ::video{id=BV1GJ411x7h7}
 *   ::video{id=https://www.bilibili.com/video/BV1GJ411x7h7 title=覆盖标题 ratio=9/16}
 *
 * 说明：
 * - src（直链）与 id（B 站 BV/av 号、视频页链接、b23.tv 短链）二选一，src 优先。
 * - 数据解析与 HTML 构建统一在 src/utils/video.ts（resolveVideo + buildVideoCardHtml），
 *   与 MDX 的 <Video /> 组件共用同一数据层与标记，保证视觉一致。
 * - 非 B 站的 id 自动降级为 link-card 跳转卡片；抓取失败也不阻塞构建。
 * - 兼容性：remark-smartypants 会把属性引号转成弯引号，parseAttrs 已做兼容；
 *   属性值在数据层拼入 HTML 前统一转义，防止注入。
 * - 播放/展开逻辑由全局脚本 src/utils/videoPlayer.ts 处理（Layout 注册）。
 * - parseVideoCard 导出给小程序导出层旁路复用同一解析（M0-0 探针 B）。
 */
import { resolveVideo, buildVideoCardHtml } from "./video";

/* ── 轻量 mdast 类型（不引入 mdast 依赖） ─────────────────────────── */
export type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
};

type MdRoot = {
  children?: MdNode[];
};

/* ── 指令与属性解析 ───────────────────────────────────────────────── */
const DIRECTIVE_RE = /^::video\s*\{([^}]*)\}\s*$/;

/** `::video` 指令的结构化属性（小程序导出层旁路复用，M0-0 探针 B） */
export type VideoCardAttrs = {
  id?: string;
  src?: string;
  poster?: string;
  title?: string;
  ratio?: string;
};

function collectText(node: MdNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(collectText).join("");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|“([^”]*)”|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1];
    const val = m[2] ?? m[3] ?? m[4] ?? m[5] ?? "";
    attrs[key] = val.trim();
  }
  return attrs;
}

/**
 * 判定一个段落节点是否为 `::video{...}` 指令，是则返回结构化属性，否则返回 null。
 * 插件本体与小程序导出层共用同一实现（M0-0 探针 B 抽出），保证端上拿到的
 * 数据与站点渲染永远同源。
 */
export function parseVideoCard(node: MdNode): VideoCardAttrs | null {
  if (node.type !== "paragraph" || !node.children) return null;
  const text = node.children
    .map(child => collectText(child))
    .join("")
    .trim();
  const match = DIRECTIVE_RE.exec(text);
  if (!match) return null;
  const attrs = parseAttrs(match[1]);
  // src / id 至少其一，否则视为误写的普通文本，保留原样
  if (!attrs.src && !attrs.id) return null;
  return {
    id: attrs.id || undefined,
    src: attrs.src || undefined,
    poster: attrs.poster || undefined,
    title: attrs.title || undefined,
    ratio: attrs.ratio || undefined,
  };
}

/* ── 插件主入口：parse → resolve → buildHtml ─────────────────────── */
export function remarkVideo() {
  return async (tree: MdRoot) => {
    const requests: { node: MdNode; attrs: VideoCardAttrs }[] = [];

    const collect = (node: MdNode) => {
      const attrs = parseVideoCard(node);
      if (attrs) requests.push({ node, attrs });
    };

    const walk = (node: MdNode) => {
      collect(node);
      for (const child of node.children ?? []) walk(child);
    };
    for (const child of tree.children ?? []) walk(child);

    if (requests.length === 0) return;

    for (const req of requests) {
      const card = await resolveVideo(req.attrs);
      req.node.type = "html";
      req.node.value = buildVideoCardHtml(card);
      delete req.node.children;
    }
  };
}

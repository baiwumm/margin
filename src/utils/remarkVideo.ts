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
 */
import { resolveVideo, buildVideoCardHtml } from "./video";

/* ── 轻量 mdast 类型（不引入 mdast 依赖） ─────────────────────────── */
type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
};

type MdRoot = {
  children?: MdNode[];
};

/* ── 指令与属性解析 ───────────────────────────────────────────────── */
const DIRECTIVE_RE = /^::video\s*\{([^}]*)\}\s*$/;

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

/* ── 插件主入口 ───────────────────────────────────────────────────── */
export function remarkVideo() {
  return async (tree: MdRoot) => {
    const requests: { node: MdNode; attrs: Record<string, string> }[] = [];

    const collect = (node: MdNode) => {
      if (node.type !== "paragraph" || !node.children) return;
      const text = node.children
        .map(child => collectText(child))
        .join("")
        .trim();
      const match = DIRECTIVE_RE.exec(text);
      if (!match) return;
      const attrs = parseAttrs(match[1]);
      // src / id 至少其一，否则视为误写的普通文本，保留原样
      if (!attrs.src && !attrs.id) return;
      requests.push({ node, attrs });
    };

    const walk = (node: MdNode) => {
      collect(node);
      for (const child of node.children ?? []) walk(child);
    };
    for (const child of tree.children ?? []) walk(child);

    if (requests.length === 0) return;

    for (const req of requests) {
      const card = await resolveVideo({
        id: req.attrs.id || undefined,
        src: req.attrs.src || undefined,
        poster: req.attrs.poster || undefined,
        title: req.attrs.title || undefined,
        ratio: req.attrs.ratio || undefined,
      });
      req.node.type = "html";
      req.node.value = buildVideoCardHtml(card);
      delete req.node.children;
    }
  };
}

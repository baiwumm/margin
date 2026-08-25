/**
 * remarkMusic — 将 Markdown 中的 `::music{id=...}` 指令渲染为黑胶音乐播放器卡片。
 *
 * 语法（必须独立成段，整段只包含指令）：
 *
 *   ::music{id=212233}
 *   ::music{id=212233 platform=netease}
 *   ::music{id=212233 audio=/audio/212233.mp3}
 *
 * 说明：
 * - 与 MDX 的 <Music /> 标签共用同一数据层（src/utils/music.ts）与视觉结构。
 * - 构建期调用 resolveTrack 取数（含本地缓存/探测/回源，失败降级），输出静态 HTML。
 * - 不依赖运行时请求；封面用远程链接，无封面时 CSS 黑胶占位。
 * - 播放逻辑由全局脚本 src/utils/musicPlayer.ts 处理（Layout 注册），因为 remark
 *   注入的 raw HTML 不在组件 scope 内，scoped 脚本无法生效。
 * - HTML 结构与 src/components/Music.astro 对齐，保证文章/瞬间视觉一致。
 */
import {
  resolveTrack,
  platformLabel,
  isMusicPlatform,
  type MusicPlatform,
} from "./music";

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
const DIRECTIVE_RE = /^::music\s*\{([^}]*)\}\s*$/;

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

/* ── HTML 转义 ────────────────────────────────────────────────────── */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NETEASE_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.2a6.8 6.8 0 0 1 6.8 6.8c0 1.2-.3 2.3-.9 3.3l-2.1-1.2c.3-.7.5-1.5.5-2.1a4.2 4.2 0 1 0-4.2 4.2c.6 0 1.2-.1 1.7-.4L12 18a6.8 6.8 0 0 1-6.8-6.8A6.8 6.8 0 0 1 12 5.2z"/></svg>';

const ICON_PLAY =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 2.5a.5.5 0 0 1 .765-.424l10 5.5a.5.5 0 0 1 0 .848l-10 5.5A.5.5 0 0 1 3 13.5v-11z"/></svg>';

const ICON_PAUSE =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';

const ICON_LINK =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

function buildHtml(opts: {
  url: string;
  name: string;
  artist: string;
  cover: string;
  label: string;
  audioUrl: string;
}): string {
  const { url, name, artist, cover, label, audioUrl } = opts;
  const hasCover = Boolean(cover);
  const hasAudio = Boolean(audioUrl);
  const coverHtml = hasCover
    ? `<img class="music-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async" />`
    : `<span class="music-cover-placeholder"></span>`;
  const progressHtml = hasAudio
    ? `<div class="music-progress" data-music-progress role="slider" tabindex="0" aria-label="播放进度" aria-valuenow="0" aria-valuemin="0" aria-valuemax="0"><div class="music-progress-bar" data-music-bar></div></div>`
    : "";
  const timeHtml = hasAudio
    ? `<span class="music-time"><span data-music-current>0:00</span><span class="opacity-40"> / </span><span data-music-total>0:00</span></span>`
    : "";
  const toggleLabel = hasAudio ? "播放" : "在平台打开";
  return (
    `<div class="music-card music-player not-prose" data-audio="${escapeHtml(audioUrl)}" data-label="${escapeHtml(name)}" data-href="${escapeHtml(url)}">` +
    `<div class="music-inner">` +
    `<div class="music-vinyl" aria-hidden="true"><div class="music-disc">${coverHtml}<span class="music-spindle"></span></div></div>` +
    `<div class="music-body">` +
    `<div class="music-title-row">` +
    `<div class="music-titles">` +
    `<span class="music-platform font-firacode"><span class="music-platform-icon">${NETEASE_ICON}</span>${escapeHtml(label.toUpperCase())}</span>` +
    `<span class="music-name">${escapeHtml(name)}</span>` +
    `<span class="music-artist">${escapeHtml(artist)}</span>` +
    `</div>` +
    `<button class="music-toggle" type="button" data-music-toggle aria-label="${toggleLabel}" data-playing="false">` +
    `<span class="music-icon-play">${ICON_PLAY}</span><span class="music-icon-pause">${ICON_PAUSE}</span></button>` +
    `</div>` +
    progressHtml +
    `<div class="music-meta-row">${timeHtml}` +
    `<a class="music-open" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="在${escapeHtml(label)}打开">${ICON_LINK}<span>打开</span></a>` +
    `</div></div></div></div>`
  );
}

/* ── 插件主入口 ───────────────────────────────────────────────────── */
export function remarkMusic() {
  return async (tree: MdRoot) => {
    const requests: {
      node: MdNode;
      id: string;
      platform: MusicPlatform;
      audio?: string;
    }[] = [];

    const collect = (node: MdNode) => {
      if (node.type !== "paragraph" || !node.children) return;
      const text = node.children
        .map(child => collectText(child))
        .join("")
        .trim();
      const match = DIRECTIVE_RE.exec(text);
      if (!match) return;
      const attrs = parseAttrs(match[1]);
      const id = attrs.id;
      if (!id) return;
      // platform 来自用户手写的指令属性，必须白名单校验后才能索引 PLATFORM_META，
      // 否则拼写错误（如 neteasee）会在取数时抛 TypeError 中断构建
      const rawPlatform = attrs.platform;
      const platform =
        rawPlatform && isMusicPlatform(rawPlatform) ? rawPlatform : "netease";
      requests.push({ node, id, platform, audio: attrs.audio });
    };

    const walk = (node: MdNode) => {
      collect(node);
      for (const child of node.children ?? []) walk(child);
    };
    for (const child of tree.children ?? []) walk(child);

    if (requests.length === 0) return;

    for (const req of requests) {
      const track = await resolveTrack(req.id, req.platform, req.audio);
      const label = platformLabel(req.platform);
      req.node.type = "html";
      req.node.value = buildHtml({
        url: track.url,
        name: track.name,
        artist: track.artist,
        cover: track.cover,
        label,
        audioUrl: track.audioUrl,
      });
      delete req.node.children;
    }
  };
}

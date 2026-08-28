/**
 * video — 视频数据层（构建期确定，静态写入 HTML，零运行时请求）。
 *
 * 设计要点：
 * - 三种形态，由 resolveVideo 按输入自动选择：
 *   1. direct：src 直链（本地 / 第三方 mp4），自定义控制条站内播放；
 *   2. bilibili：id 识别为 B 站（BV/av 号、视频页链接、b23.tv 短链）→ 构建期取
 *      标题/封面/UP主，封面 facade 点击后展开官方 iframe 外链播放器；
 *   3. fallback：非 B 站内容一律降级为跳转卡片（复用 link-card 的取数与样式）。
 * - 优先级：src > id；显式 poster/title > 平台元数据；ratio 显式 > 平台默认 16/9。
 * - src 为网页地址（text/html）时自动转平台解析或降级，避免渲染出必然失败的播放器。
 * - 取数策略与 music.ts 一致：本地 JSON 缓存（video-cache.json，提交入库）+ 回源
 *   抓取 + 失败降级，绝不阻塞构建。
 * - HTML 由 buildVideoCardHtml 统一构建，MD 的 ::video 指令与 MDX 的 <Video />
 *   组件共用，保证两入口标记完全一致。
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCardHtml, fetchTdk, type Tdk } from "./remarkLinkCard";

/* ── 类型 ─────────────────────────────────────────────────────────── */
export interface VideoCardInput {
  /** B 站 BV/av 号、视频页链接或 b23.tv 短链；非 B 站内容降级为跳转卡片 */
  id?: string;
  /** 视频直链（本地 / 开头的 public 路径，或 http(s) mp4 直链），优先级高于 id */
  src?: string;
  /** 封面（显式指定时优先于平台封面） */
  poster?: string;
  /** 标题（显式指定时优先于平台标题） */
  title?: string;
  /** 画面宽高比（如 16/9、9/16），默认 16/9 */
  ratio?: string;
}

export type VideoCard =
  | {
      mode: "direct";
      src: string;
      poster?: string;
      title?: string;
      ratio?: string;
    }
  | {
      mode: "bilibili";
      /** 官方外链播放器地址（含 autoplay 参数，由前端点击时注入 iframe） */
      embedUrl: string;
      /** B 站视频页地址（「打开」外链） */
      pageUrl: string;
      title: string;
      cover: string;
      author: string;
      /** 时长（秒），0 表示未知 */
      duration: number;
      ratio?: string;
    }
  | {
      mode: "fallback";
      url: string;
      overrideTitle?: string;
      tdk?: Tdk | null;
    };

/* ── 抓取配置（与 remarkLinkCard / music.ts 一致：UA + 超时 + 降级） ── */
const FETCH_TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** 缓存记录最大有效龄期（ms）；超过则下次构建回源刷新。0 = 永不主动失效 */
const CACHE_MAX_AGE_MS = 0;

/** B 站官方外链播放器（facade 点击时注入 iframe） */
function buildEmbedUrl(ref: { bvid?: string; aid?: number; page?: number }) {
  const params = new URLSearchParams({ autoplay: "1", high_quality: "1" });
  if (ref.bvid) params.set("bvid", ref.bvid);
  if (ref.aid) params.set("aid", String(ref.aid));
  if (ref.page) params.set("page", String(ref.page));
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function buildPageUrl(ref: { bvid?: string; aid?: number; page?: number }) {
  const base = ref.bvid
    ? `https://www.bilibili.com/video/${ref.bvid}/`
    : `https://www.bilibili.com/video/av${ref.aid}`;
  return ref.page ? `${base}?p=${ref.page}` : base;
}

/* ── 缓存文件读写（与 music-cache.json 同模式） ────────────────────── */
interface BiliVideoRecord {
  title: string;
  cover: string;
  author: string;
  /** 秒 */
  duration: number;
  fetchedAt?: number;
}

interface VideoCache {
  /** b23.tv 短链 → 真实视频页地址 */
  shortLinks: Record<string, string>;
  /** `bvid:BV..` / `aid:N` → 视频信息 */
  videos: Record<string, BiliVideoRecord>;
  /** src 直链探测：url → "video" | "html" */
  probes: Record<string, "video" | "html">;
}

const CACHE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "video-cache.json"
);

function loadCache(): VideoCache {
  try {
    if (existsSync(CACHE_PATH)) {
      const parsed = JSON.parse(
        readFileSync(CACHE_PATH, "utf-8")
      ) as Partial<VideoCache>;
      return {
        shortLinks: parsed.shortLinks ?? {},
        videos: parsed.videos ?? {},
        probes: parsed.probes ?? {},
      };
    }
  } catch {
    // 缓存损坏时视为空，不阻塞构建
  }
  return { shortLinks: {}, videos: {}, probes: {} };
}

let cacheDirty = false;
const cache = loadCache();

function saveCache() {
  if (!cacheDirty) return;
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf-8");
    cacheDirty = false;
  } catch {
    // 写回失败（如只读环境）仅降级，不影响构建产物
  }
}

function isFresh(fetchedAt?: number): boolean {
  if (!CACHE_MAX_AGE_MS || !fetchedAt) return true;
  return Date.now() - fetchedAt <= CACHE_MAX_AGE_MS;
}

/* ── 工具 ─────────────────────────────────────────────────────────── */
/** 去除不可见控制字符（与 music.ts 的 sanitize 一致），避免接口脏字符 */
function sanitize(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out.trim();
}

/** 秒 → m:ss / h:mm:ss */
function fmtDuration(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** ratio 必须是「数字/数字」形式才允许注入 style（与 Video.astro 历史校验一致） */
const RATIO_RE = /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/;

function safeRatio(ratio?: string): string | undefined {
  return ratio && RATIO_RE.test(ratio) ? ratio.replace(/\s/g, "") : undefined;
}

/* ── B 站 ID 解析 ──────────────────────────────────────────────────── */
type BilibiliRef =
  | { kind: "bvid"; bvid: string; page?: number }
  | { kind: "aid"; aid: number; page?: number }
  | { kind: "shortlink"; url: string };

/**
 * 识别输入是否为 B 站内容：BV 号、av 号、bilibili.com 视频页链接（含 ?p= 分 P）、
 * b23.tv 短链。识别失败返回 null，由上层降级为跳转卡片。
 */
export function parseBilibiliRef(raw: string): BilibiliRef | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 ID 形态（BV 号区分大小写；av 号大小写均可）
  if (/^BV[0-9A-Za-z]{10}$/.test(input)) return { kind: "bvid", bvid: input };
  const avMatch = /^av(\d+)$/i.exec(input);
  if (avMatch) return { kind: "aid", aid: Number(avMatch[1]) };

  // 链接形态：允许省略 https:// 前缀
  const candidate = /^https?:\/\//i.test(input)
    ? input
    : /^((www|m)\.)?(bilibili\.com|b23\.tv)\//i.test(input)
      ? `https://${input}`
      : "";
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host === "b23.tv" || host.endsWith(".b23.tv")) {
    return { kind: "shortlink", url: url.href };
  }
  if (!host.endsWith("bilibili.com")) return null;

  const bvMatch = /\/video\/(BV[0-9A-Za-z]{10})/.exec(url.pathname);
  const avId = /\/video\/av(\d+)/i.exec(url.pathname)?.[1];
  if (!bvMatch && !avId) return null;
  const p = Number.parseInt(url.searchParams.get("p") ?? "", 10);
  const page = Number.isInteger(p) && p > 0 ? p : undefined;
  return bvMatch
    ? { kind: "bvid", bvid: bvMatch[1], page }
    : { kind: "aid", aid: Number(avId), page };
}

/* ── 抓取：b23.tv 短链 / B 站视频信息 ──────────────────────────────── */
/** 解析 b23.tv 短链为真实视频页地址（构建期跟随重定向，结果落盘缓存） */
async function resolveShortLink(url: string): Promise<string | null> {
  const cached = cache.shortLinks[url];
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, referer: "https://www.bilibili.com/" },
      redirect: "follow",
      signal: controller.signal,
    });
    const final = res.url;
    if (res.ok && final && parseBilibiliRef(final)) {
      cache.shortLinks[url] = final;
      cacheDirty = true;
      saveCache();
      return final;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 抓取 B 站视频信息（公开接口，免登录）。
 * 返回值：记录（命中）| "missing"（接口明确表示视频不存在，确定性失败）| null（网络等暂时性失败） */
async function fetchBilibiliInfo(ref: {
  bvid?: string;
  aid?: number;
  page?: number;
}): Promise<BiliVideoRecord | "missing" | null> {
  const key = ref.bvid ? `bvid:${ref.bvid}` : `aid:${ref.aid}`;
  const cached = cache.videos[key];
  if (cached && isFresh(cached.fetchedAt)) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const query = ref.bvid ? `bvid=${ref.bvid}` : `aid=${ref.aid}`;
    const res = await fetch(
      `https://api.bilibili.com/x/web-interface/view?${query}`,
      {
        headers: { "user-agent": UA, referer: "https://www.bilibili.com/" },
        redirect: "follow",
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      // 4xx：视频确实不可访问（已删除/不存在），属确定性结果
      return res.status >= 400 && res.status < 500 ? "missing" : null;
    }
    const json = (await res.json()) as {
      code?: number;
      data?: {
        title?: string;
        pic?: string;
        duration?: number;
        owner?: { name?: string };
      };
    };
    // -400：ID 非法（BV 校验失败）；-404：视频不存在。均为确定性失败，降级为跳转卡片
    if (json.code === -400 || json.code === -404) return "missing";
    if (json.code !== 0 || !json.data) return null;
    const rec: BiliVideoRecord = {
      title: sanitize(json.data.title ?? ""),
      cover: sanitize(json.data.pic ?? ""),
      author: sanitize(json.data.owner?.name ?? ""),
      duration: json.data.duration ?? 0,
      fetchedAt: Date.now(),
    };
    if (!rec.title && !rec.cover) return null;
    cache.videos[key] = rec;
    cacheDirty = true;
    saveCache();
    return rec;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 探测 http(s) 直链的内容类型：video（含 octet-stream）或 html（网页，需转平台解析） */
async function probeSrc(src: string): Promise<"video" | "html" | null> {
  const cached = cache.probes[src];
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(src, {
      method: "HEAD",
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: controller.signal,
    });
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    let result: "video" | "html" | null = null;
    if (ct.includes("text/html")) result = "html";
    else if (ct.includes("video/") || ct.includes("octet-stream"))
      result = "video";
    if (result) {
      cache.probes[src] = result;
      cacheDirty = true;
      saveCache();
    }
    return result;
  } catch {
    // 探测失败（网络/超时/不支持 HEAD）不改变行为，保持直链模式
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── 解析入口 ─────────────────────────────────────────────────────── */
async function resolveBilibili(
  ref: { bvid?: string; aid?: number; page?: number },
  overrides: Pick<VideoCardInput, "poster" | "title" | "ratio">
): Promise<VideoCard> {
  const info = await fetchBilibiliInfo(ref);
  const pageUrl = buildPageUrl(ref);
  // 接口明确表示视频不存在（已删除/ID 错误）：降级为跳转卡片；
  // 网络失败等暂时性错误则保留 B 站卡片（占位元数据），下次构建会重试
  if (info === "missing") {
    return resolveFallback(pageUrl, overrides);
  }
  // B 站 API 返回的封面是 http:// 协议，HTTPS 站点上会被当作混合内容拦截，
  // hdslb CDN 支持 HTTPS，统一升级
  const cover =
    overrides.poster || info?.cover.replace(/^http:\/\//i, "https://") || "";
  return {
    mode: "bilibili",
    embedUrl: buildEmbedUrl(ref),
    pageUrl,
    title: overrides.title || info?.title || (ref.bvid ?? `av${ref.aid}`),
    cover,
    author: info?.author || "",
    duration: info?.duration ?? 0,
    ratio: overrides.ratio,
  };
}

/** 非 B 站内容：降级为 link-card 跳转卡片（复用 remarkLinkCard 的取数与样式） */
async function resolveFallback(
  rawUrl: string,
  overrides: Pick<VideoCardInput, "poster" | "title" | "ratio">
): Promise<VideoCard> {
  let url = rawUrl.trim();
  // 非 URL 输入（如拼错的 BV 号）：兜底指向 B 站视频页，作者在预览时能立刻发现
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    url = `https://www.bilibili.com/video/${encodeURIComponent(url)}`;
  }
  const tdk = /^https?:\/\//i.test(url) ? await fetchTdk(url) : null;
  return { mode: "fallback", url, overrideTitle: overrides.title, tdk };
}

async function resolveById(
  id: string,
  overrides: Pick<VideoCardInput, "poster" | "title" | "ratio">
): Promise<VideoCard> {
  const ref = parseBilibiliRef(id);
  if (!ref) return resolveFallback(id, overrides);

  if (ref.kind === "shortlink") {
    const resolved = await resolveShortLink(ref.url);
    const inner = resolved ? parseBilibiliRef(resolved) : null;
    if (inner && inner.kind !== "shortlink") {
      return resolveBilibili(
        {
          bvid: inner.kind === "bvid" ? inner.bvid : undefined,
          aid: inner.kind === "aid" ? inner.aid : undefined,
          page: inner.page,
        },
        overrides
      );
    }
    // 短链解析失败：降级为跳转卡片（指向短链或解析结果）
    return resolveFallback(resolved ?? ref.url, overrides);
  }

  return resolveBilibili(
    {
      bvid: ref.kind === "bvid" ? ref.bvid : undefined,
      aid: ref.kind === "aid" ? ref.aid : undefined,
      page: ref.page,
    },
    overrides
  );
}

/**
 * 解析视频卡片（构建期调用，MD 指令与 MDX 组件共用）。
 * 优先级：src > id；src 为网页地址时自动转平台解析/降级；id 非 B 站降级为跳转卡片。
 */
export async function resolveVideo(input: VideoCardInput): Promise<VideoCard> {
  const { id, src, poster, title, ratio } = input;
  const overrides = { poster, title, ratio };

  if (src) {
    if (/^https?:\/\//i.test(src) && (await probeSrc(src)) === "html") {
      // 贴了网页地址：按平台解析，非 B 站则降级为跳转卡片
      return resolveById(src, overrides);
    }
    return { mode: "direct", src, poster, title, ratio };
  }

  if (id) return resolveById(id, overrides);

  // 理论上不会走到（指令/组件/schema 均已要求 id 或 src 至少其一）
  return { mode: "fallback", url: "" };
}

/* ── HTML 构建（MD 指令与 MDX 组件共用，保证标记一致） ─────────────── */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ICON_PLAY =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 2.5a.5.5 0 0 1 .765-.424l10 5.5a.5.5 0 0 1 0 .848l-10 5.5A.5.5 0 0 1 3 13.5v-11z"/></svg>';

const ICON_PAUSE =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';

const ICON_VOLUME =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';

const ICON_MUTED =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

const ICON_FULLSCREEN_ENTER =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

const ICON_FULLSCREEN_EXIT =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

const ICON_LINK =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

/** 直链模式：自定义控制条播放器（与 video.css 的 .video-* 规则对应） */
function buildDirectHtml(
  card: Extract<VideoCard, { mode: "direct" }>,
  className?: string
): string {
  const ratio = safeRatio(card.ratio);
  const styleAttr = ratio ? ` style="--video-ratio: ${escapeHtml(ratio)}"` : "";
  const posterAttr = card.poster ? ` poster="${escapeHtml(card.poster)}"` : "";
  // 无封面时用 preload="metadata" + #t=0.1 让浏览器只拉元数据即渲染首帧；
  // 有封面时保持 preload="none"，首屏零字节
  const hasPoster = Boolean(card.poster);
  const preload = hasPoster ? "none" : "metadata";
  const videoSrc =
    hasPoster || card.src.includes("#") ? card.src : `${card.src}#t=0.1`;
  const cardClass = className
    ? ` class="${escapeHtml(className)} video-card video-player not-prose"`
    : ' class="video-card video-player not-prose"';
  const headHtml = card.title
    ? `<div class="video-head"><span class="video-tag font-firacode">VIDEO</span><span class="video-name">${escapeHtml(card.title)}</span></div>`
    : "";
  return (
    `<div${cardClass}${styleAttr}>` +
    `<div class="video-inner">` +
    `<div class="video-frame">` +
    `<video class="video-el" src="${escapeHtml(videoSrc)}"${posterAttr} preload="${preload}" playsinline></video>` +
    `<button class="video-overlay" type="button" data-video-overlay aria-label="播放视频"><span class="video-overlay-circle"><span class="video-icon-play">${ICON_PLAY}</span></span></button>` +
    `<div class="video-error" role="status"><span>视频加载失败</span><a href="${escapeHtml(card.src)}" target="_blank" rel="noopener noreferrer">打开原链接</a></div>` +
    `</div>` +
    headHtml +
    `<div class="video-controls">` +
    `<button class="video-toggle" type="button" data-video-toggle aria-label="播放" data-playing="false"><span class="video-icon-play">${ICON_PLAY}</span><span class="video-icon-pause">${ICON_PAUSE}</span></button>` +
    `<div class="video-progress" data-video-progress role="slider" tabindex="0" aria-label="播放进度" aria-valuenow="0" aria-valuemin="0" aria-valuemax="0"><div class="video-progress-bar" data-video-bar></div></div>` +
    `<span class="video-time"><span data-video-current>0:00</span><span class="video-time-sep" aria-hidden="true">/</span><span data-video-total>0:00</span></span>` +
    `<button class="video-btn video-mute" type="button" data-video-mute aria-label="静音" data-muted="false"><span class="video-icon-volume">${ICON_VOLUME}</span><span class="video-icon-muted">${ICON_MUTED}</span></button>` +
    `<button class="video-btn video-fs" type="button" data-video-fullscreen aria-label="全屏"><span class="video-icon-enter">${ICON_FULLSCREEN_ENTER}</span><span class="video-icon-exit">${ICON_FULLSCREEN_EXIT}</span></button>` +
    `</div></div></div>`
  );
}

/** B 站模式：封面 facade，点击后由全局脚本注入官方 iframe */
function buildBilibiliHtml(
  card: Extract<VideoCard, { mode: "bilibili" }>,
  className?: string
): string {
  const ratio = safeRatio(card.ratio);
  const styleAttr = ratio ? ` style="--video-ratio: ${escapeHtml(ratio)}"` : "";
  const cardClass = className
    ? ` class="${escapeHtml(className)} video-card video-player video-embed not-prose"`
    : ' class="video-card video-player video-embed not-prose"';
  const coverHtml = card.cover
    ? `<img class="video-cover" src="${escapeHtml(card.cover)}" alt="" referrerpolicy="no-referrer" loading="lazy" decoding="async" />`
    : "";
  const headHtml =
    `<div class="video-head">` +
    `<span class="video-tag font-firacode">BILIBILI</span>` +
    `<span class="video-name">${escapeHtml(card.title)}</span>` +
    `</div>`;
  const durationHtml =
    card.duration > 0
      ? `<span class="video-time">${fmtDuration(card.duration)}</span>`
      : "";
  const authorHtml = card.author
    ? `<span class="video-author">${escapeHtml(card.author)}</span>`
    : `<span class="video-author"></span>`;
  return (
    `<div${cardClass} data-embed="${escapeHtml(card.embedUrl)}" data-href="${escapeHtml(card.pageUrl)}"${styleAttr}>` +
    `<div class="video-inner">` +
    `<div class="video-frame">` +
    coverHtml +
    `<div class="video-embed-slot" data-video-embed-slot></div>` +
    `<button class="video-overlay" type="button" data-video-embed-toggle aria-label="播放视频"><span class="video-overlay-circle"><span class="video-icon-play">${ICON_PLAY}</span></span></button>` +
    `</div>` +
    headHtml +
    `<div class="video-meta-row">` +
    authorHtml +
    `<span class="video-meta-right">${durationHtml}` +
    `<a class="video-open" href="${escapeHtml(card.pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="在哔哩哔哩打开">${ICON_LINK}<span>打开</span></a>` +
    `</span></div></div></div>`
  );
}

/** 构建视频卡片 HTML（resolveVideo 的结果 → 静态标记） */
export function buildVideoCardHtml(
  card: VideoCard,
  className?: string
): string {
  switch (card.mode) {
    case "direct":
      return buildDirectHtml(card, className);
    case "bilibili":
      return buildBilibiliHtml(card, className);
    case "fallback": {
      if (!card.url) return "";
      return buildCardHtml(
        { url: card.url, overrideTitle: card.overrideTitle },
        card.tdk ?? undefined
      );
    }
  }
}

/**
 * music — 音乐数据层（构建期确定，静态写入 HTML，零运行时请求）。
 *
 * 设计要点：
 * - 网易云音乐无官方稳定 API，本模块采用「社区非官方接口 + 本地 JSON 缓存」策略：
 *   构建时先读 `music-cache.json`；命中且有 cover 则直接用，避免每次构建都抓取；
 *   未命中/失效才回源抓取，并写回缓存文件（需提交到仓库，便于离线/CI 构建）。
 * - 音频播放：优先使用显式提供的 mp3（frontmatter/指令的 audio 字段），其次按
 *   歌曲 ID 自动探测 `public/audio/{id}.mp3`，再次回退到抓取到的直链（B 兜底），
 *   都没有则降级为「点击跳转平台播放页」。
 * - 抓取失败或字段缺失时降级，绝不阻塞构建（与 remarkLinkCard 思路一致）。
 * - 平台可扩展：PLATFORM_META 增加条目即可，组件与数据层均无需改动。
 *
 * 缓存文件位置：与本模块同目录的 `music-cache.json`（被 git 跟踪，内容自动维护）。
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* ── 类型 ─────────────────────────────────────────────────────────── */
export type MusicPlatform = "netease" | "qq";

export interface MusicTrack {
  /** 歌曲 ID（平台侧） */
  id: string;
  /** 平台标识 */
  platform: MusicPlatform;
  /** 歌曲名称 */
  name: string;
  /** 歌手名称 */
  artist: string;
  /** 封面图 URL（远程，可能为空 → 走黑胶占位） */
  cover: string;
  /** 点击跳转地址（外链播放页） */
  url: string;
  /** 站内可播放的音频地址（本地 mp3 或稳定直链），空则降级为跳转 */
  audioUrl: string;
}

/** 单条缓存记录（存盘结构，含抓取时间戳用于失效判断） */
interface CacheRecord {
  name: string;
  artist: string;
  cover: string;
  url: string;
  /** 抓取到的直链（B 兜底，可能不稳定/为空） */
  audioUrl?: string;
  /** 抓取时间（ms 时间戳），用于可选过期策略 */
  fetchedAt?: number;
}

/** 缓存文件结构：key = `${platform}:${id}` */
type MusicCache = Record<string, CacheRecord>;

/* ── 平台元信息 ───────────────────────────────────────────────────── */
const PLATFORM_META: Record<
  MusicPlatform,
  {
    label: string;
    url: (id: string) => string;
    fetch?: (id: string) => Promise<CacheRecord | null>;
  }
> = {
  netease: {
    label: "网易云音乐",
    url: id => `https://music.163.com/song?id=${id}`,
    fetch: fetchNetease,
  },
  qq: {
    label: "QQ音乐",
    url: id => `https://y.qq.com/n/ryqq/songDetail/${id}`,
    fetch: fetchQQ,
  },
};

/** 白名单校验：指令属性等外部输入的平台值必须先过此函数，避免 PLATFORM_META[platform] 命中 undefined */
export function isMusicPlatform(value: string): value is MusicPlatform {
  return value in PLATFORM_META;
}

/* ── 抓取配置（与 remarkLinkCard 一致：UA + 超时 + 降级） ──────────── */
const FETCH_TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** 缓存记录最大有效龄期（ms）；超过则下次构建回源刷新。0 = 永不主动失效 */
const CACHE_MAX_AGE_MS = 0;

/** 本地音频目录（相对项目根）：public/audio */
const AUDIO_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/audio"
);

/**
 * 去除不可见控制字符（U+0000–U+001F、U+007F），避免接口脏字符显示乱码。
 * 使用 charCode 判断，源码中不含任何字面控制字符。
 */
function sanitize(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out.trim();
}

/** 探测 public/audio/{id}.mp3 是否存在（构建期） */
function probeLocalAudio(id: string): string {
  try {
    if (existsSync(join(AUDIO_DIR, `${id}.mp3`))) {
      return `/audio/${id}.mp3`;
    }
  } catch {
    // 忽略探测错误，走后续兜底
  }
  return "";
}

/* ── 缓存文件读写 ─────────────────────────────────────────────────── */
const CACHE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "music-cache.json"
);

function loadCache(): MusicCache {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, "utf-8")) as MusicCache;
    }
  } catch {
    // 缓存损坏时视为空，不阻塞构建
  }
  return {};
}

let cacheDirty = false;
const cacheStore: MusicCache = loadCache();

function saveCache() {
  if (!cacheDirty) return;
  try {
    writeFileSync(
      CACHE_PATH,
      JSON.stringify(cacheStore, null, 2) + "\n",
      "utf-8"
    );
    cacheDirty = false;
  } catch {
    // 写回失败（如只读环境）仅告警降级，不影响构建产物
  }
}

function cacheKey(platform: MusicPlatform, id: string): string {
  return `${platform}:${id}`;
}

function readCached(platform: MusicPlatform, id: string): CacheRecord | null {
  const rec = cacheStore[cacheKey(platform, id)];
  if (!rec) return null;
  if (CACHE_MAX_AGE_MS > 0 && rec.fetchedAt) {
    if (Date.now() - rec.fetchedAt > CACHE_MAX_AGE_MS) return null;
  }
  return rec;
}

function writeCached(platform: MusicPlatform, id: string, rec: CacheRecord) {
  cacheStore[cacheKey(platform, id)] = rec;
  cacheDirty = true;
}

/* ── 网易云抓取（社区非官方接口） ─────────────────────────────────── */
/**
 * 社区常用非官方接口：music.163.com/api/song/detail。
 * 返回 songs[0]：name / artists[].name / album.picUrl / （mp3Url 直链常失效，仅作兜底）。
 * 失败时返回 null，由上层降级。
 */
async function fetchNetease(id: string): Promise<CacheRecord | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://music.163.com/api/song/detail/?id=${encodeURIComponent(
      id
    )}&ids=${encodeURIComponent(`[${id}]`)}`;
    const res = await fetch(url, {
      headers: { "user-agent": UA, referer: "https://music.163.com/" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      songs?: Array<{
        name?: string;
        artists?: Array<{ name?: string }>;
        album?: { picUrl?: string; name?: string };
        mp3Url?: string;
      }>;
    };
    const song = json.songs?.[0];
    if (!song) return null;
    const name = sanitize(song.name ?? "");
    const artist = sanitize(song.artists?.[0]?.name ?? "");
    const cover = sanitize(song.album?.picUrl ?? "");
    const audioUrl = sanitize(song.mp3Url ?? "");
    if (!name && !artist && !cover && !audioUrl) return null;
    return {
      name,
      artist,
      cover,
      url: `https://music.163.com/song?id=${id}`,
      audioUrl: audioUrl || undefined,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── QQ音乐抓取（非官方接口） ─────────────────────────────────────── */
/**
 * QQ音乐非官方接口：c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg。
 * 入参 id 支持两种 QQ ID：
 *   - songmid：字母数字混合（旧版分享链接 songmid= 后的字符串）
 *   - songid：纯数字（新版 ryqq_v2/songDetail/{id} 用的 ID）
 * 自动识别：纯数字走 songid 参数，其余走 songmid 参数。
 * 返回 data[0]：name / singer[].name / album.mid（用来拼封面 CDN 地址）。
 * 失败时返回 null，由上层降级。
 */
async function fetchQQ(id: string): Promise<CacheRecord | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const isNumeric = /^\d+$/.test(id);
    const key = isNumeric ? "songid" : "songmid";
    const url = `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?${key}=${encodeURIComponent(
      id
    )}&platform=yqq&format=json`;
    const res = await fetch(url, {
      headers: { "user-agent": UA, referer: "https://y.qq.com/" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{
        name?: string;
        singer?: Array<{ name?: string }>;
        album?: { mid?: string; id?: number; name?: string };
      }>;
    };
    const song = json.data?.[0];
    if (!song) return null;
    const name = sanitize(song.name ?? "");
    const artist = sanitize(song.singer?.[0]?.name ?? "");
    // QQ 接口不直接返回封面 URL，按 album.mid 拼接 QQ 音乐封面 CDN 地址；
    // 拼接失败（无 album.mid）时为空，走黑胶占位降级
    const albumMid = song.album?.mid;
    const cover = albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
      : "";
    if (!name && !artist && !cover) return null;
    return {
      name,
      artist,
      cover,
      url: `https://y.qq.com/n/ryqq/songDetail/${id}`,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── 对外入口 ─────────────────────────────────────────────────────── */
/**
 * 解析一首歌曲的完整信息（构建期调用）。
 * 音频优先级：显式 audio > 本地 public/audio/{id}.mp3 > 缓存直链(B兜底) > 空(跳转)。
 * 任何环节失败都降级，保证返回可用的 MusicTrack。
 */
export async function resolveTrack(
  id: string,
  platform: MusicPlatform = "netease",
  explicitAudio?: string
): Promise<MusicTrack> {
  const meta = PLATFORM_META[platform];
  const fallbackUrl = meta.url(id);

  const cached = readCached(platform, id);
  if (cached && (cached.cover || cached.name)) {
    const audioUrl =
      explicitAudio || probeLocalAudio(id) || cached.audioUrl || "";
    return {
      id,
      platform,
      name: cached.name || `网易云音乐 #${id}`,
      artist: cached.artist || "未知歌手",
      cover: cached.cover || "",
      url: cached.url || fallbackUrl,
      audioUrl,
    };
  }

  let rec: CacheRecord | null = null;
  if (meta.fetch) {
    rec = await meta.fetch(id);
  }
  if (rec) {
    writeCached(platform, id, rec);
  }
  saveCache();

  const audioUrl = explicitAudio || probeLocalAudio(id) || rec?.audioUrl || "";
  return {
    id,
    platform,
    name: rec?.name || `网易云音乐 #${id}`,
    artist: rec?.artist || "未知歌手",
    cover: rec?.cover || "",
    url: rec?.url || fallbackUrl,
    audioUrl,
  };
}

/** 平台展示名（用于卡片徽标） */
export function platformLabel(platform: MusicPlatform): string {
  return PLATFORM_META[platform].label;
}

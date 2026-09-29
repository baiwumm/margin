/**
 * 图片工具（D25 / D23 / 探针 A）：ImageMetadata → AssetRef。
 *
 * 「只选择、不生成」（D25）：按集合用站点已产出的档位（research.md F7 实测）
 * 请求变体，请求宽度 ⊆ 站点已渲染的 srcset → 变体零新增（D46 定档）：
 * - blog 正文图   [640, 750, 828, 1080, 1280, 1541] → thumb 640 / md 750 / src 1280
 * - 画廊照片      [400, 800, 1600]                  → thumb 400 / md 800 / src 1600
 * - 画廊封面      [800, 1200, 1600]                 → thumb 800 / md 800 / src 1600
 * - 瞬间图        [400, 800]                        → thumb 400 / md 800 / src 800
 * 请求宽 > 原图宽时 Astro 不放大（实际宽 = 原图宽，即站点的小图原始档）。
 * thumb 目标 ≤400 而 blog 无该档 → 按「≤目标宽度的最大可用档」回落到最小档，
 * 如实写实际宽度（api-contract §1）。
 *
 * getImage 在 Endpoint 内调用会把变体随构建落盘 dist/_astro/（探针 A 实证）；
 * avgColor：sharp 1×1 flatten 白底取平均色（探针 A 实证 CF 镜像可跑）；
 * bytes：源文件字节数。
 */
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import sharp from "sharp";
import { join } from "node:path";
import { statSync } from "node:fs";
import { absolutize } from "./base";
import type { AssetRef } from "./types";

type LoadedMeta = {
  src: string;
  width: number;
  height: number;
  format: string;
};
type ImageModule = { default: LoadedMeta };

/** 图片在导出层的角色（决定档位集合，D46） */
export type AssetKind = "blog" | "galleryPhoto" | "galleryCover" | "moment";

// 注意：import.meta.glob 只接受字符串字面量，模式不能提取为常量
const sourceImages = new Map<string, LoadedMeta>();
for (const map of [
  import.meta.glob<ImageModule>(
    "/src/data/blog/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}",
    { eager: true }
  ),
  import.meta.glob<ImageModule>(
    "/src/data/galleries/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}",
    { eager: true }
  ),
  import.meta.glob<ImageModule>(
    "/src/data/moments/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}",
    { eager: true }
  ),
]) {
  for (const [key, mod] of Object.entries(map)) sourceImages.set(key, mod.default);
}

/* ── 档位定档（D46，依据 research.md F7 的站点实测 srcset）────────── */

const TIERS: Record<AssetKind, { thumb: number; md: number; src: number }> = {
  blog: { thumb: 640, md: 750, src: 1280 },
  galleryPhoto: { thumb: 400, md: 800, src: 1600 },
  galleryCover: { thumb: 800, md: 800, src: 1600 },
  moment: { thumb: 400, md: 800, src: 800 },
};

export function hasImage(globKey: string): boolean {
  return sourceImages.has(globKey);
}

/* ── avgColor（按源图缓存，一图一次）──────────────────────────────── */

const avgColorCache = new Map<string, string>();

async function averageColor(fsPath: string): Promise<string> {
  const cached = avgColorCache.get(fsPath);
  if (cached) return cached;
  const data = await sharp(fsPath)
    .flatten({ background: "#ffffff" })
    .resize(1, 1)
    .raw()
    .toBuffer();
  const hex = `#${[data[0], data[1], data[2]]
    .map(v => v.toString(16).padStart(2, "0"))
    .join("")}`;
  avgColorCache.set(fsPath, hex);
  return hex;
}

/* ── 档位变体（按 图+角色 缓存，三档一次生成）─────────────────────── */

interface Variant {
  src: string;
  width: number;
}

async function variant(meta: LoadedMeta, width: number): Promise<Variant> {
  const result = await getImage({ src: meta as ImageMetadata, width });
  // getImage 不放大小图：实际宽度 = min(请求宽, 原图宽)
  return { src: result.src, width: Math.min(width, meta.width) };
}

const assetRefCache = new Map<string, Promise<AssetRef>>();

/**
 * @param globKey import.meta.glob 键，形如 /src/data/blog/<slug>/01-x.webp
 * @param kind 图片角色（决定档位集合，缺省按目录推断）
 */
export function toAssetRef(
  globKey: string,
  kind: AssetKind = inferKind(globKey)
): Promise<AssetRef> {
  const cacheKey = `${kind}|${globKey}`;
  const cached = assetRefCache.get(cacheKey);
  if (cached) return cached;
  const job = buildAssetRef(globKey, kind);
  assetRefCache.set(cacheKey, job);
  return job;
}

function inferKind(globKey: string): AssetKind {
  if (globKey.includes("/blog/")) return "blog";
  if (globKey.includes("/moments/")) return "moment";
  return "galleryPhoto";
}

async function buildAssetRef(globKey: string, kind: AssetKind): Promise<AssetRef> {
  const meta = sourceImages.get(globKey);
  if (!meta) {
    throw new Error(`[mp-export] 图片未在集合 glob 中找到：${globKey}`);
  }
  const fsPath = join(process.cwd(), globKey.replace(/^\//, ""));
  const tiers = TIERS[kind];
  const [thumb, md, src] = await Promise.all([
    variant(meta, tiers.thumb),
    variant(meta, tiers.md),
    variant(meta, tiers.src),
  ]);
  const avgColor = await averageColor(fsPath);
  let bytes = 0;
  try {
    bytes = statSync(fsPath).size;
  } catch {
    bytes = 0;
  }
  return {
    src: absolutize(src.src),
    md: absolutize(md.src),
    thumb: absolutize(thumb.src),
    srcWidth: src.width,
    mdWidth: md.width,
    thumbWidth: thumb.width,
    width: meta.width,
    height: meta.height,
    format: meta.format,
    bytes,
    avgColor,
  };
}

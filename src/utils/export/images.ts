/**
 * 图片工具（D25 / D23 / 探针 A）：ImageMetadata → AssetRef。
 * - 三集合源图构建期 eager 收集（与站点 4 处 glob 同款模式）；
 * - 档位：thumb ≤400 / md ≤800 / src = min(原图宽, 1600)，getImage 在 Endpoint
 *   内调用会把变体随构建落盘 dist/_astro/（M0-0 探针 A 实证）；
 * - avgColor：sharp 1×1 flatten 白底取平均色（探针 A 实证 CF 镜像可跑）；
 * - bytes：源文件字节数（变体为源图重编码，webp 源下近似相等；误差在 M0 报告说明）。
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

/* ── 档位变体（按源图缓存，三档一次生成）─────────────────────────── */

const THUMB_WIDTH = 400;
const MD_WIDTH = 800;
const SRC_MAX_WIDTH = 1600;

interface Variant {
  src: string;
  width: number;
}

async function variant(
  meta: LoadedMeta,
  width: number
): Promise<Variant> {
  // getImage 不放大小图：实际宽度 = min(请求宽, 原图宽)
  const actual = Math.min(width, meta.width);
  const result = await getImage({ src: meta as ImageMetadata, width });
  return { src: result.src, width: actual };
}

const assetRefCache = new Map<string, Promise<AssetRef>>();

/**
 * @param globKey import.meta.glob 键，形如 /src/data/blog/<slug>/01-x.webp
 */
export function toAssetRef(globKey: string): Promise<AssetRef> {
  const cached = assetRefCache.get(globKey);
  if (cached) return cached;
  const job = buildAssetRef(globKey);
  assetRefCache.set(globKey, job);
  return job;
}

async function buildAssetRef(globKey: string): Promise<AssetRef> {
  const meta = sourceImages.get(globKey);
  if (!meta) {
    throw new Error(`[mp-export] 图片未在集合 glob 中找到：${globKey}`);
  }
  const fsPath = join(process.cwd(), globKey.replace(/^\//, ""));
  const [thumb, md, src] = await Promise.all([
    variant(meta, THUMB_WIDTH),
    variant(meta, MD_WIDTH),
    variant(meta, SRC_MAX_WIDTH),
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

/** 目录型内容（/<coll>/<slug>/index.md）与其图片的 glob 键前缀 */
export function imageKeyPrefix(collection: "blog" | "galleries" | "moments", slug: string): string {
  return `/src/data/${collection}/${slug}/`;
}

export function imageKeyFor(collection: "blog" | "galleries" | "moments", slug: string, file: string): string {
  return `/src/data/${collection}/${slug}/${file}`;
}

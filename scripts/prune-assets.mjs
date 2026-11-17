/**
 * 构建后裁剪：删除 dist/_astro 下没有任何引用的图片。
 *
 * 为什么需要：内容图片通过 import.meta.glob({ eager: true }) 导入以取宽高，
 * Astro 会把每张源图的原件额外落盘到 _astro，而站点与导出层只使用 resize 后
 * 的变体，这些原件没有任何页面 / JSON / CSS / JS 引用；画廊与瞬间的整目录
 * glob 还会把未被正文引用的历史图片一并落盘。2026-11-17 实测可回收约 100MB。
 *
 * 安全边界：
 * - 只删除 dist/_astro 根目录下的图片文件（webp / png / jpg / gif / avif / svg）；
 * - 引用扫描覆盖 dist 内全部 html / json / xml / txt / css / js（含 api/ 导出 JSON、
 *   内联在 HTML 里的 srcset 与 style）；
 * - 若扫描到引用了不存在的图片直接报错退出，避免产物自相矛盾。
 */
/* eslint-disable no-console -- 构建脚本需要在终端输出裁剪结果 */
import { readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const ASTRO = join(DIST, "_astro");
const IMAGE_RE = /\.(?:webp|png|jpe?g|gif|avif|svg)$/i;
const TEXT_RE = /\.(?:html|json|xml|txt|css|js|mjs|map|webmanifest)$/i;
const REF_RE = /_astro\/([A-Za-z0-9._-]+)/g;

const refs = new Set();
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (TEXT_RE.test(entry.name)) {
      for (const match of readFileSync(path, "utf8").matchAll(REF_RE)) {
        refs.add(match[1]);
      }
    }
  }
};
walk(DIST);

const images = readdirSync(ASTRO).filter(
  name => IMAGE_RE.test(name) && statSync(join(ASTRO, name)).isFile()
);
const present = new Set(images);

const dangling = [...refs].filter(
  name => IMAGE_RE.test(name) && !present.has(name)
);
if (dangling.length > 0) {
  console.error(
    `[prune-assets] ${dangling.length} 个被引用的图片不存在，构建产物不完整：`
  );
  for (const name of dangling.slice(0, 10)) console.error(`  ${name}`);
  process.exit(1);
}

const dead = images.filter(name => !refs.has(name));
let removedBytes = 0;
for (const name of dead) {
  removedBytes += statSync(join(ASTRO, name)).size;
  unlinkSync(join(ASTRO, name));
}

const mb = bytes => `${(bytes / 1048576).toFixed(1)}MB`;
console.log(
  `[prune-assets] 保留 ${images.length - dead.length} 张被引用图片，` +
    `删除 ${dead.length} 张无引用图片（回收 ${mb(removedBytes)}）`
);

/**
 * 构建后资源整理：先按内容去重，再删除没有任何引用的图片。
 *
 * 为什么需要：
 * - 同一张图会被不同组件以不同参数请求，Astro 按参数算 hash，于是落出多份
 *   字节完全相同、只有文件名不同的变体（2026-11-17 实测浪费 36.8MB）；
 * - 内容图片通过 import.meta.glob({ eager: true }) 导入以取宽高，Astro 会把
 *   每张源图的原件额外落盘到 _astro，而站点与导出层只使用 resize 后的变体；
 *   画廊与瞬间的整目录 glob 还会把未被正文引用的历史图片一并落盘（实测 76.9MB）。
 *
 * 做法：内容相同的文件只保留一份（名字最短者），并把 dist 内所有引用改指它；
 * 随后删除仍然没人引用的图片。
 *
 * 安全边界：
 * - 只处理 dist/_astro 根目录下的图片文件（webp / png / jpg / gif / avif / svg）；
 * - 只重写 dist 内的文本产物（html / json / xml / txt / css / js）；字节相同才合并，
 *   因此不会改变任何图片内容；
 * - 若扫描到引用了不存在的图片直接报错退出，避免产物自相矛盾。
 */
/* eslint-disable no-console -- 构建脚本需要在终端输出整理结果 */
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIST = "dist";
const ASTRO = join(DIST, "_astro");
const IMAGE_RE = /\.(?:webp|png|jpe?g|gif|avif|svg)$/i;
const TEXT_RE = /\.(?:html|json|xml|txt|css|js|mjs|map|webmanifest)$/i;
const REF_RE = /_astro\/([A-Za-z0-9._-]+)/g;

const mb = bytes => `${(bytes / 1048576).toFixed(1)}MB`;

/* ── 1. 按内容去重 ──────────────────────────────────────────────── */

const images = readdirSync(ASTRO).filter(
  name => IMAGE_RE.test(name) && statSync(join(ASTRO, name)).isFile()
);

const byHash = new Map();
for (const name of images) {
  const hash = createHash("sha256")
    .update(readFileSync(join(ASTRO, name)))
    .digest("hex");
  const group = byHash.get(hash);
  if (group) group.push(name);
  else byHash.set(hash, [name]);
}

const rename = new Map();
for (const group of byHash.values()) {
  if (group.length < 2) continue;
  // 规范名：最短者优先（不带额外参数后缀），同长按字典序，保证多次构建一致
  const canonical = [...group].sort(
    (a, b) => a.length - b.length || a.localeCompare(b)
  )[0];
  for (const name of group) if (name !== canonical) rename.set(name, canonical);
}

let dedupedBytes = 0;
if (rename.size > 0) {
  const rewrite = text => {
    let next = text;
    for (const [from, to] of rename) {
      if (next.includes(`_astro/${from}`)) {
        next = next.split(`_astro/${from}`).join(`_astro/${to}`);
      }
    }
    return next;
  };
  const walkText = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walkText(path);
      } else if (TEXT_RE.test(entry.name)) {
        const text = readFileSync(path, "utf8");
        const next = rewrite(text);
        if (next !== text) writeFileSync(path, next);
      }
    }
  };
  walkText(DIST);

  for (const [from, to] of rename) {
    dedupedBytes += statSync(join(ASTRO, from)).size;
    unlinkSync(join(ASTRO, from));
    void to;
  }
}

/* ── 2. 删除仍然没有引用的图片 ──────────────────────────────────── */

const refs = new Set();
const walkRefs = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRefs(path);
    } else if (TEXT_RE.test(entry.name)) {
      for (const match of readFileSync(path, "utf8").matchAll(REF_RE)) {
        refs.add(match[1]);
      }
    }
  }
};
walkRefs(DIST);

const remaining = readdirSync(ASTRO).filter(
  name => IMAGE_RE.test(name) && statSync(join(ASTRO, name)).isFile()
);
const present = new Set(remaining);

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

const dead = remaining.filter(name => !refs.has(name));
let removedBytes = 0;
for (const name of dead) {
  removedBytes += statSync(join(ASTRO, name)).size;
  unlinkSync(join(ASTRO, name));
}

console.log(
  `[prune-assets] 按内容去重 ${rename.size} 份（回收 ${mb(dedupedBytes)}）；` +
    `保留 ${remaining.length - dead.length} 张被引用图片，` +
    `删除 ${dead.length} 张无引用图片（回收 ${mb(removedBytes)}）`
);

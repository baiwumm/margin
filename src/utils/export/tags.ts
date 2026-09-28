/**
 * 标签聚合与配色（D22 / D31）：
 * - 口径 = blog + galleries 非 draft 合并去重（moments 的标签不进标签页）；
 * - slug 沿用 margin 的 slugifyStr（拉丁 lower，CJK kebabcase）；
 * - 配色 = 公式生成（10 档、色相每 36°、S/L 固定），按 count 降序序号取档；
 *   ink 固定白字：color = hsl(h,45%,32%)、colorDark = hsl(h,40%,22%)，
 *   全 10 档 × 明暗两底 WCAG ≥ 4.5:1（最低 4.97，构建期断言兜底，违规即失败）。
 */
import { slugifyStr } from "../slugify";
import type { Tag } from "./types";

/* ── WCAG 相对亮度与对比度 ────────────────────────────────────────── */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

function luminance(h: number, s: number, l: number): number {
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = hslToRgb(h, s, l).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** HSL → #RRGGBB */
function hex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l).map(v =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${r}${g}${b}`;
}

/* ── 10 档公式色板（色相每 36°，S/L 固定，白字）──────────────────── */

export const PALETTE_SIZE = 10;
const INK = "#ffffff";
const COLOR_S = 0.45;
const COLOR_L = 0.32;
const DARK_S = 0.4;
const DARK_L = 0.22;

export function shadeAt(i: number): {
  color: string;
  colorDark: string;
  ink: string;
} {
  const hue = (i * 36) % 360;
  return { color: hex(hue, COLOR_S, COLOR_L), colorDark: hex(hue, DARK_S, DARK_L), ink: INK };
}

export function assertPaletteWCAG(): void {
  const white = luminance(0, 0, 1);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const hue = (i * 36) % 360;
    const cLight = contrast(white, luminance(hue, COLOR_S, COLOR_L));
    const cDark = contrast(white, luminance(hue, DARK_S, DARK_L));
    if (cLight < 4.5 || cDark < 4.5) {
      throw new Error(
        `[mp-export] 标签色板第 ${i} 档 WCAG 对比度不足：light=${cLight.toFixed(2)} dark=${cDark.toFixed(2)}（需 ≥ 4.5）`
      );
    }
  }
}

/* ── 标签聚合 ─────────────────────────────────────────────────────── */

export function buildTags(
  posts: { tags: string[] }[],
  galleries: { tags: string[] }[]
): Tag[] {
  const counts = new Map<string, number>();
  for (const list of [posts, galleries]) {
    for (const entry of list) {
      for (const name of entry.tags) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  return sorted.map(([name, count], i) => ({
    name,
    slug: slugifyStr(name),
    count,
    ...shadeAt(i % PALETTE_SIZE),
  }));
}

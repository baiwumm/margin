/**
 * 导出层公共基座：Envelope 包装、buildId / 内容 hash、体积与 URL 断言（D44）。
 * 断言违规直接 throw，使 Cloudflare 构建失败 —— 不合规发不了版。
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import type { ApiEnvelope } from "./types";

export const SCHEMA_VERSION = 1;
/** D19：assetBase 固定 www，无尾斜杠；任何请求不得依赖裸域 301 */
export const ASSET_BASE = "https://www.baiwumm.com";

/** 站内链接判定：/ 开头或 baiwumm.com 系域名（含裸域与 www） */
export function isInternalUrl(raw: string): boolean {
  if (raw.startsWith("/")) return true;
  try {
    const host = new URL(raw).hostname;
    return host === "baiwumm.com" || host.endsWith(".baiwumm.com");
  } catch {
    return false;
  }
}

/** 相对路径 → 绝对 URL（assetBase 无尾斜杠拼接） */
export function absolutize(path: string): string {
  return `${ASSET_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 可读标签：git short sha（浅克隆/无 git 环境降级为 unknown） */
function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** 资源指纹：sha256 截断 12 位（缓存失效比对足够，manifest 体积减半） */
export function shortHash(input: string): string {
  return sha256Hex(input).slice(0, 12);
}

/**
 * 内容 hash 只覆盖 data（不含 generatedAt 等时变字段），
 * 保证同内容重复构建 buildId 稳定，端上缓存不失效。
 */
export function contentHash(payloads: unknown[]): string {
  const hash = createHash("sha256");
  for (const p of payloads) hash.update(JSON.stringify(p));
  return hash.digest("hex");
}

export function makeBuildId(dataHash: string): string {
  return `${gitShortSha()}-${dataHash.slice(0, 12)}`;
}

export function envelope<T>(
  data: T,
  buildId: string,
  generatedAt: string
): ApiEnvelope<T> {
  return { schemaVersion: SCHEMA_VERSION, buildId, generatedAt, data };
}

/* ── 体积预算（gzip 前，单位字节）与断言 ──────────────────────────── */
/* manifest / titles 两项为 M0 实测修订（原估算 4KB / 40KB 在 74 篇全量 +
 * resources 清单 + 拼音键的现实下不成立，实测 19.1KB / 46.3KB，留余量定档；
 * 端上真实流量以 gzip 后为准：manifest ≈ 4KB、titles ≈ 12KB） */
export const BUDGETS: Record<string, number> = {
  "manifest.json": 24 * 1024,
  "site.json": 6 * 1024,
  "posts/index.json": 80 * 1024,
  "posts/[slug].json": 200 * 1024,
  "galleries/index.json": 4 * 1024,
  "galleries/[slug].json": 200 * 1024,
  "moments/index.json": 60 * 1024,
  "tags/index.json": 12 * 1024,
  "friends.json": 8 * 1024,
  "projects.json": 8 * 1024,
  "stats.json": 16 * 1024,
  "search/titles.json": 48 * 1024,
  "search/terms.json": 400 * 1024,
};

export function assertBudget(name: string, json: string): void {
  const budget = BUDGETS[name];
  if (budget === undefined) return;
  if (Buffer.byteLength(json, "utf8") > budget) {
    throw new Error(
      `[mp-export] ${name} 超出体积预算：${Buffer.byteLength(json, "utf8")} > ${budget} 字节（gzip 前）`
    );
  }
}

/** URL 断言：不得出现 //_astro/（重复斜杠）与裸域 https://baiwumm.com/ */
export function assertUrls(name: string, json: string): void {
  if (json.includes("//_astro/")) {
    throw new Error(`[mp-export] ${name} 含非法 URL //_astro/（双斜杠）`);
  }
  if (json.includes("https://baiwumm.com/")) {
    throw new Error(`[mp-export] ${name} 含裸域 URL（必须使用 www，D19）`);
  }
}

/** 构建期警告清单（unknown 块等）：警告不阻断发布 */
export function warnBuild(message: string): void {
  // 构建日志通道，非调试残留；ESLint no-console 在此显式豁免
  // eslint-disable-next-line no-console
  console.warn(`[mp-export] ${message}`);
}

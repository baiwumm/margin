/**
 * GitHub 构建期共享工具（projectStats.ts / githubContributions.ts 使用）。
 */

/**
 * Env helper: prefer real process.env (platform env vars), fall back to
 * import.meta.env so values from the project's .env file also work.
 * Astro dev 模式只把 .env 注入 import.meta.env，构建时两者都可能存在。
 */
export const getEnv = (key: string): string => {
  const procValue = process.env[key];
  if (procValue) return procValue;
  try {
    const metaValue = (import.meta.env as Record<string, unknown>)[key];
    return typeof metaValue === "string" ? metaValue : "";
  } catch {
    return "";
  }
};

/** 解析 GitHub 链接（个人主页或仓库 URL）中的账号。 */
export const parseLogin = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] ? parts[0] : null;
  } catch {
    return null;
  }
};

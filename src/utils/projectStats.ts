/**
 * 构建期从 GitHub API 拉取项目 stars / forks（Projects 页面使用）。
 *
 * 策略：
 * - 配置私有环境变量 `GITHUB_TOKEN` 后，构建时请求一次
 *   `/users/{owner}/repos` 批量获取全部仓库统计（带 Token 限流 5000 次/小时）；
 * - 网络值优先，无 Token / 请求失败 / 非 GitHub 链接时回退到 `projects.ts`
 *   中手动维护的静态数字，构建不中断；
 * - 同时汇总名下全部仓库的 stars 总数与账号加入 GitHub 的时间
 *   （Projects 页面 Hero 徽章使用），拉取失败时这两个字段省略、徽章隐藏；
 * - Token 为私有变量，绝不能带 `PUBLIC_` 前缀（否则会打进客户端产物）。
 */
import type { Project } from "@/data/projects";

type RepoStats = { stars?: number; forks?: number };

const parseRepo = (url: string): { owner: string; repo: string } | null => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname === "github.com" && parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
    }
  } catch {
    // 非法 URL 直接忽略
  }
  return null;
};

/**
 * Env helper: prefer real process.env (platform env vars), fall back to
 * import.meta.env so values from the project's .env file also work.
 * Astro dev 模式只把 .env 注入 import.meta.env，构建时两者都可能存在。
 */
const getEnv = (key: string): string => {
  const procValue = process.env[key];
  if (procValue) return procValue;
  try {
    const metaValue = (import.meta.env as Record<string, unknown>)[key];
    return typeof metaValue === "string" ? metaValue : "";
  } catch {
    return "";
  }
};

const fetchOwnerRepos = async (
  owner: string
): Promise<Map<string, RepoStats>> => {
  const map = new Map<string, RepoStats>();
  const token = getEnv("GITHUB_TOKEN");
  if (!token) return map;

  const response = await fetch(
    `https://api.github.com/users/${owner}/repos?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "margin-blog",
      },
    }
  );
  if (!response.ok) return map;

  const repos = (await response.json()) as Array<{
    name: string;
    stargazers_count: number;
    forks_count: number;
  }>;
  for (const repo of repos) {
    map.set(repo.name, {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
    });
  }
  return map;
};

const fetchUserCreatedAt = async (owner: string): Promise<string | undefined> => {
  const token = getEnv("GITHUB_TOKEN");
  if (!token) return undefined;

  const response = await fetch(`https://api.github.com/users/${owner}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "margin-blog",
    },
  });
  if (!response.ok) return undefined;

  const user = (await response.json()) as { created_at?: string };
  return user.created_at;
};

/** Projects 页面 Hero 使用的账号级汇总数据。 */
export type ProjectStats = {
  /** 合并了 GitHub 实时统计的项目数组（失败时原样返回，构建不中断） */
  projects: Project[];
  /** 名下全部仓库 stars 总数（无 Token / 拉取失败时省略） */
  accountStars?: number;
  /** GitHub 账号创建时间，ISO 8601（无 Token / 拉取失败时省略） */
  joinedAt?: string;
};

/** 返回合并了 GitHub 实时统计的项目数组与账号级汇总（失败时字段省略，构建不中断）。 */
export const getProjectStats = async (
  projects: Project[]
): Promise<ProjectStats> => {
  const firstRepoUrl = projects
    .map(({ repoUrl }) => repoUrl)
    .find((url): url is string => Boolean(url));
  const owner = firstRepoUrl ? parseRepo(firstRepoUrl)?.owner : undefined;
  if (!owner) return { projects };

  let stats = new Map<string, RepoStats>();
  try {
    stats = await fetchOwnerRepos(owner);
  } catch {
    // 网络异常时回退静态值，构建不中断
  }
  if (stats.size === 0) return { projects };

  const accountStars = [...stats.values()].reduce(
    (sum, { stars }) => sum + (stars ?? 0),
    0
  );
  let joinedAt: string | undefined;
  try {
    joinedAt = await fetchUserCreatedAt(owner);
  } catch {
    // 拉取失败仅省略 Hero 徽章，构建不中断
  }

  return {
    projects: projects.map(project => {
      if (!project.repoUrl) return project;
      const repo = parseRepo(project.repoUrl)?.repo;
      if (!repo) return project;
      const remote = stats.get(repo);
      if (!remote) return project;
      return {
        ...project,
        stars: remote.stars ?? project.stars,
        forks: remote.forks ?? project.forks,
      };
    }),
    accountStars,
    joinedAt,
  };
};

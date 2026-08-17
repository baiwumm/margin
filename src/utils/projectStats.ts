/**
 * 构建期从 GitHub API 拉取项目 stars / forks（Projects 页面使用）。
 *
 * 策略：
 * - 配置私有环境变量 `GITHUB_TOKEN` 后，构建时请求一次
 *   `/users/{owner}/repos` 批量获取全部仓库统计（带 Token 限流 5000 次/小时）；
 * - 网络值优先，无 Token / 请求失败 / 非 GitHub 链接时回退到 `projects.ts`
 *   中手动维护的静态数字，构建不中断；
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

/** 返回合并了 GitHub 实时统计的项目数组（失败时原样返回，构建不中断）。 */
export const getProjectStats = async (
  projects: Project[]
): Promise<Project[]> => {
  const firstRepoUrl = projects
    .map(({ repoUrl }) => repoUrl)
    .find((url): url is string => Boolean(url));
  const owner = firstRepoUrl ? parseRepo(firstRepoUrl)?.owner : undefined;
  if (!owner) return projects;

  let stats = new Map<string, RepoStats>();
  try {
    stats = await fetchOwnerRepos(owner);
  } catch {
    // 网络异常时回退静态值，构建不中断
  }
  if (stats.size === 0) return projects;

  return projects.map(project => {
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
  });
};

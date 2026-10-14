/**
 * 构建期从 GitHub API 组装项目数据（Projects 页面使用）。
 *
 * 策略：
 * - 项目列表只配置仓库名（`projects.ts`），描述、主页、语言、标签、
 *   stars / forks 均构建期从 `/users/{owner}/repos` 批量拉取（带 Token
 *   限流 5000 次/小时；接口也允许匿名访问，无 Token 时构建照常）；
 * - 账号从 `PUBLIC_SOCIAL_GITHUB` 解析（与 githubContributions.ts 一致）；
 * - 拉取结果做模块级缓存：一次构建中页面与导出管线各调用一次
 *   `getProjectStats`，实际只请求一轮 GitHub 接口；
 * - 仓库不存在（改名 / 删除）或拉取失败时跳过该条目，构建不中断，
 *   页面展示空状态；拉取成功时未匹配的配置名随结果返回（`unmatched`，
 *   dev 模式用于拼写错误提醒）；
 * - 标签按 `TOPIC_PRIORITY` 把语言 / 主流框架类 topics 排前（API 返回
 *   纯字母序，直接展示会淹没核心技术栈），其余保持原字母序；
 * - 同时汇总名下全部仓库的 stars 总数与账号加入 GitHub 的时间
 *   （Projects 页面 Hero 徽章使用），拉取失败时这两个字段省略、徽章隐藏；
 * - Token 为私有变量，绝不能带 `PUBLIC_` 前缀（否则会打进客户端产物）。
 */
import type { Project, ProjectConfig } from "@/data/projects";
import { getEnv, parseLogin } from "@/utils/github";

type RepoFields = {
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
};

/** 排前的核心标签关键字（语言 / 主流框架），按需补充。 */
const TOPIC_PRIORITY = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "java",
  "go",
  "react",
  "vue",
  "angular",
  "svelte",
  "nextjs",
  "nuxt",
  "astro",
  "nestjs",
  "nodejs",
];

/** 命中关键字的标签排前，其余排后并保持 GitHub 的字母序。 */
const topicRank = (topic: string): number => {
  const index = TOPIC_PRIORITY.findIndex(keyword =>
    topic.startsWith(keyword)
  );
  return index === -1 ? TOPIC_PRIORITY.length : index;
};

type OwnerSnapshot = {
  repos: Map<string, RepoFields>;
  accountStars?: number;
  joinedAt?: string;
};

const fetchSnapshot = async (owner: string): Promise<OwnerSnapshot> => {
  const token = getEnv("GITHUB_TOKEN");
  const headers: Record<string, string> = { "User-Agent": "margin-blog" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const snapshot: OwnerSnapshot = { repos: new Map() };

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/users/${owner}/repos?per_page=100`,
      { headers }
    );
    if (response.ok) {
      const repos = (await response.json()) as RepoFields[];
      for (const repo of repos) {
        snapshot.repos.set(repo.name, repo);
      }
    }
  } catch {
    // 网络异常时跳过全部项目，构建不中断
    return snapshot;
  }

  if (snapshot.repos.size === 0) return snapshot;

  snapshot.accountStars = [...snapshot.repos.values()].reduce(
    (sum, { stargazers_count }) => sum + stargazers_count,
    0
  );

  try {
    const userResponse = await fetch(`https://api.github.com/users/${owner}`, {
      headers,
    });
    if (userResponse.ok) {
      const user = (await userResponse.json()) as { created_at?: string };
      snapshot.joinedAt = user.created_at;
    }
  } catch {
    // 拉取失败仅省略 Hero 徽章，构建不中断
  }

  return snapshot;
};

/** 模块级缓存：一次构建（或 dev 进程存活期）只请求一轮 GitHub 接口。 */
let snapshotPromise: Promise<OwnerSnapshot> | null = null;
const getSnapshot = (owner: string): Promise<OwnerSnapshot> => {
  snapshotPromise ??= fetchSnapshot(owner);
  return snapshotPromise;
};

/** Projects 页面使用的组装结果。 */
export type ProjectStats = {
  /** 配置顺序的项目数组（仓库不存在或拉取失败时跳过对应条目） */
  projects: Project[];
  /** 配置了但 GitHub 上不存在的仓库名（仅拉取成功时返回，dev 拼写提醒用） */
  unmatched?: string[];
  /** 名下全部仓库 stars 总数（拉取失败时省略） */
  accountStars?: number;
  /** GitHub 账号创建时间，ISO 8601（拉取失败时省略） */
  joinedAt?: string;
};

/** 按配置顺序组装 GitHub 实时项目数据（失败时跳过条目，构建不中断）。 */
export const getProjectStats = async (
  configs: ProjectConfig[]
): Promise<ProjectStats> => {
  const owner = parseLogin(getEnv("PUBLIC_SOCIAL_GITHUB"));
  if (!owner) return { projects: [] };

  const { repos, accountStars, joinedAt } = await getSnapshot(owner);

  const resolved: Project[] = [];
  const unmatched: string[] = [];
  for (const config of configs) {
    const repo = repos.get(config.name);
    if (!repo) {
      // 拉取成功但仓库不存在（多为拼写错误），记录供 dev 提醒；整体失败时不报
      if (repos.size > 0) unmatched.push(config.name);
      continue;
    }
    resolved.push({
      name: repo.name,
      description: repo.description,
      repoUrl: `https://github.com/${owner}/${repo.name}`,
      npmUrl: config.npmUrl,
      homepageUrl: repo.homepage || undefined,
      language: repo.language || undefined,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      tags: [...(repo.topics ?? [])].sort((a, b) => topicRank(a) - topicRank(b)),
      featured: config.featured,
    });
  }

  return {
    projects: resolved,
    unmatched: unmatched.length > 0 ? unmatched : undefined,
    accountStars,
    joinedAt,
  };
};

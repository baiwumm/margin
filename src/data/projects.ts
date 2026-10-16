/**
 * 开源项目配置（Projects 页面使用）。
 *
 * 维护说明：
 * - 只需配置 GitHub 仓库名 `name`（与仓库严格同名、区分大小写），描述、
 *   主页、语言、标签、stars / forks 均在构建期从 GitHub API 拉取，
 *   跟随仓库端数据，仓库端改动自动同步到站点；
 * - 仓库不存在（改名 / 删除）或拉取失败时自动跳过该条目，无需手动清理；
 * - `featured: true` 的项目置顶展示（带置顶徽章与 featured 辉光边框）；
 * - npm 包链接 API 拿不到，有 npm 包的项目手动配置 `npmUrl`。
 */

/** GitHub 语言 → 官方语言色；未收录的语言由卡片回退到主题色。 */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
};

/** Projects 页面卡片数据（构建期由 `projectStats.ts` 从 GitHub API 组装）。 */
export type Project = {
  /** 项目名称（即 GitHub 仓库名） */
  name: string;
  /** 一句话描述（仓库端 description，可能为空） */
  description: string | null;
  /** GitHub 仓库链接（由配置的仓库名拼出） */
  repoUrl: string;
  /** npm 包链接（可选，API 拿不到，来自手动配置） */
  npmUrl?: string;
  /** 在线体验链接（仓库端 homepage，可选） */
  homepageUrl?: string;
  /** 主要语言（仓库端 language，色点颜色由 `LANGUAGE_COLORS` 查表） */
  language?: string;
  /** Star 数（构建期由 GitHub API 拉取） */
  stars?: number;
  /** Fork 数（构建期由 GitHub API 拉取） */
  forks?: number;
  /** 技术栈标签（仓库端 topics） */
  tags: string[];
  /** 是否置顶 */
  featured?: boolean;
};

/** 项目配置：只维护仓库名与可选的 npm 链接、置顶标记。 */
export type ProjectConfig = {
  /** GitHub 仓库名（与仓库严格同名、区分大小写） */
  name: string;
  /** npm 包链接（API 拿不到，手动配置） */
  npmUrl?: string;
  /** 是否置顶 */
  featured?: boolean;
};

export const projects: ProjectConfig[] = [
  { name: "better-admin", featured: true },
  {
    name: "theme-switch-animation",
    npmUrl: "https://www.npmjs.com/package/theme-switch-animation",
    featured: true,
  },
  { name: "daily-trending" },
  { name: "EasyAPI" },
  { name: "better-nav" },
  {
    name: "vue3-okr-tree",
    npmUrl: "https://www.npmjs.com/package/vue3-okr-tree",
  },
  {
    name: "react-okr-tree",
    npmUrl: "https://www.npmjs.com/package/react-okr-tree",
  },
  { name: "free-for-dev-zh" },
];

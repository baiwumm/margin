/**
 * 开源项目数据（Projects 页面使用）。
 *
 * 维护说明：
 * - `stars` / `forks` 为手动维护的静态数字，构建期由页面计算汇总；
 *   不确定或不想展示时省略即可。
 * - `featured: true` 的项目置顶展示（带置顶徽章与 featured 辉光边框）。
 */

export type Project = {
  /** 项目名称 */
  name: string;
  /** 中文一句话描述 */
  description: string;
  /** GitHub 仓库链接（可选，无仓库的项目省略即可） */
  repoUrl?: string;
  /** 在线体验链接（可选） */
  homepageUrl?: string;
  /** 主要语言 */
  language?: string;
  /** 语言色点颜色（GitHub 官方语言色） */
  languageColor?: string;
  /** Star 数（构建期由 GitHub API 覆盖；无仓库或不展示时省略） */
  stars?: number;
  /** Fork 数（构建期由 GitHub API 覆盖；无仓库或不展示时省略） */
  forks?: number;
  /** 技术栈标签 */
  tags: string[];
  /** 是否置顶 */
  featured?: boolean;
};

export const projects: Project[] = [
  {
    name: "next-daily-hot",
    description:
      "基于 Next.js 构建的热点聚合平台，实时汇聚微博、知乎、B 站、抖音、GitHub 等 30+ 平台的热门内容。",
    repoUrl: "https://github.com/baiwumm/next-daily-hot",
    homepageUrl: "https://hot.baiwumm.com",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["Next.js", "Hero UI"],
    featured: true,
  },
  {
    name: "Easy Api",
    description: "一个把常用 API 收拾得干干净净的小站。",
    homepageUrl: "https://api.baiwumm.com",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["Next.js", "Hero UI", "Supabase"],
    featured: true,
  },
  {
    name: "Better Nav",
    description: "一个把常用网址收拾得干干净净的小站。",
    repoUrl: "https://github.com/baiwumm/better-nav",
    homepageUrl: "https://nav.baiwumm.com",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["Next.js", "Hero UI", "Supabase"],
    featured: true,
  },
  {
    name: "Better Nuxt",
    description:
      "基于 Nuxt.js + Better-auth + Nuxt UI + Drizzle ORM + PostgreSQL，构建高性能、类型安全的全栈应用",
    repoUrl: "https://github.com/baiwumm/better-nuxt",
    homepageUrl: "https://nuxt.baiwumm.com/",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["Nuxt.js", "Better-Auth", "Drizzle"],
  },
  {
    name: "Vue3 Admin",
    description:
      "前端基于 Soybean Admin 二次开发、后端基于 Nest.js + Prisma + PostgreSQL 的全栈后台管理系统。",
    repoUrl: "https://github.com/baiwumm/vue3-admin",
    homepageUrl: "https://vue3.baiwumm.com/",
    language: "TypeScript",
    languageColor: "#3178c6",
    tags: ["Vue3", "Nest.js", "Prisma"],
  },
];

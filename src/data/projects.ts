/**
 * 开源项目数据（Projects 页面使用）。
 *
 * 维护说明：
 * - `stars` / `forks` 为手动维护的静态数字，构建期由页面计算汇总；
 *   不确定或不想展示时省略即可。
 * - `featured: true` 的项目置顶展示（带置顶徽章与 featured 辉光边框）。
 */

/** 主要语言枚举：值即展示文案，新增语言在这里加一行。 */
export const ProjectLanguage = {
  TypeScript: "TypeScript",
} as const;

export type ProjectLanguage =
  (typeof ProjectLanguage)[keyof typeof ProjectLanguage];

/** 语言 → GitHub 官方语言色；`satisfies` 保证每个语言都配到颜色。 */
export const LANGUAGE_COLORS = {
  [ProjectLanguage.TypeScript]: "#3178c6",
} as const satisfies Record<ProjectLanguage, string>;

export type Project = {
  /** 项目名称 */
  name: string;
  /** 中文一句话描述 */
  description: string;
  /** GitHub 仓库链接（可选，无仓库的项目省略即可） */
  repoUrl?: string;
  /** npm 包链接（可选，有则卡片渲染 npm 图标） */
  npmUrl?: string;
  /** 在线体验链接（可选） */
  homepageUrl?: string;
  /** 主要语言（色点颜色由 `LANGUAGE_COLORS` 查表得到） */
  language?: ProjectLanguage;
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
    name: "Better Admin",
    description: "一套 Admin 系统，五种技术栈实现",
    repoUrl: "https://github.com/baiwumm/better-admin",
    homepageUrl: "https://better-admin.baiwumm.com/",
    language: ProjectLanguage.TypeScript,
    tags: ["React.js", "Vue.js", "Nuxt.js","Next.js","Nest.js"],
    featured: true,
  },
  {
    name: "theme-switch-animation",
    description:
      "基于 View Transitions API 与纯 mask 动画的跨框架主题切换动画库，内置 13 种揭幕动画，支持 React / Vue / Next.js / Nuxt，浏览器不支持时自动降级。",
    repoUrl: "https://github.com/baiwumm/theme-switch-animation",
    npmUrl: "https://www.npmjs.com/package/theme-switch-animation",
    homepageUrl: "https://theme-switch-animation.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["View Transitions", "React.js", "Vue.js", "Nuxt.js"],
    featured: true,
  },
  {
    name: "daily-trending",
    description: "看看全网都在聊什么",
    repoUrl: "https://github.com/baiwumm/daily-trending",
    homepageUrl: "https://hot.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["Next.js", "Hero UI"],
  },
  {
    name: "Easy Api",
    description: "一个把常用 API 收拾得干干净净的小站。",
    homepageUrl: "https://api.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["Next.js", "Hero UI", "Supabase"],
  },
  {
    name: "Better Nav",
    description: "一个把常用网址收拾得干干净净的小站。",
    repoUrl: "https://github.com/baiwumm/better-nav",
    homepageUrl: "https://nav.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["Next.js", "Hero UI", "Supabase"],
  },
  {
    name: "vue3-okr-tree",
    description: "Vue 3 组织架构树 / OKR 树组件",
    repoUrl: "https://github.com/baiwumm/vue3-okr-tree",
    npmUrl: "https://www.npmjs.com/package/vue3-okr-tree",
    homepageUrl: "https://vue3-okr-tree.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["Vue.js"],
  },
  {
    name: "react-okr-tree",
    description: "React 组织架构树 / OKR 树组件",
    repoUrl: "https://github.com/baiwumm/react-okr-tree",
    npmUrl: "https://www.npmjs.com/package/react-okr-tree",
    homepageUrl: "https://react-okr-tree.baiwumm.com",
    language: ProjectLanguage.TypeScript,
    tags: ["React.js"],
  },
];

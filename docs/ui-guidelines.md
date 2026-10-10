# 组件、样式与代码规范

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 涉及组件、样式、性能与代码规范；改 UI / 写组件 / 写脚本前必读。

# Component Guidelines

- **优先复用**：`Card`、`GalleryCard`、`GalleryEmbed`、`Header`、`Footer`、`Breadcrumb`、`LinkButton`、`Tag`、`Datetime`、`Pagination`、`Socials`、`ShareLinks`、`EditPost`、`BackToTopButton`。改 UI 前先查这些组件是否已满足需求。
- **什么时候新建组件**：同一 UI 在 2 个以上页面复用，或组件内逻辑较复杂时；单页一次性的小片段直接写在页面里。
- **组件形式**：全部使用 Astro Component（`.astro`）；不引入 React / Vue 等框架组件。客户端逻辑写在组件 `<script>` 内，遵循「`astro:page-load` 初始化 + `AbortController` 清理 + 幂等防重复（dataset 标记或 childElementCount 判断）」。
- **放置位置**：可复用组件放 `src/components/`；图标用 `src/assets/icons/` 下的 SVG（Astro 内直接 import 使用）；页面独有样式写页面 `<style>`，跨页面共享样式进 `src/styles/`。
- **Breadcrumb 返回键**：`Breadcrumb withBackButton` 的返回链接读取 `sessionStorage("backUrl")`，该值由 `Main.astro` / `index.astro` 写入（搜索页还追加 `?q=` 参数）；改动导航/返回相关逻辑前先了解这条数据流。

# Styling Guidelines

- Tailwind 4 使用方式：CSS-first，语义色来自 `global.css` 的 `@theme inline` 映射（`bg-background`、`text-foreground`、`text-accent`、`border-border`、`bg-muted/xx`）。
- 颜色一律使用 CSS 变量 + `color-mix()`，不要写死 hex；新增配色/语义色进 `global.css` 的 Light / Dark 两套变量。
- **复用现有设计模式**：`app-layout` 容器（`max-w-app mx-auto px-4`）、Aurora hero（3 个光球 + 鼠标跟随光晕 + `glow-text`）、`card-glow` 鼠标辉光卡片、`rounded-2xl` 卡片、`rounded-full` 徽章、`font-firacode` 大写微标签、`background-clip: text` 渐变标题、玻璃拟态（`backdrop-blur` + `color-mix` 半透明背景）。
- 响应式：沿用 `sm(640) / md(768) / lg(1024) / xl(1280)` 断点；移动端 `<640px` 走汉堡菜单。
- Dark / Light：主题由 `html[data-theme]` + `@custom-variant dark` 控制；任何新样式必须两态验证；注意代码块高亮使用 `--shiki-light-bg` / `--shiki-dark-bg` 变量。
- 动画：优先 `transform` / `opacity` + `requestAnimationFrame` 节流；尊重 `prefers-reduced-motion`；避免大范围重排/重绘。
- 不引入新的 UI 框架、组件库或图标库；图标用现有 SVG 或内联 SVG。

# Performance Guidelines

- 全站静态生成：数据在构建期计算（`getCollection` + 服务端过滤排序），不要在客户端重复加载内容集合。
- 最少客户端 JavaScript：能服务端渲染完成就不写脚本；第三方 UI（PagefindUI）动态 `import` 并按需初始化。
- 图片优化：使用 `astro:assets` 的 `Image` 组件并显式提供 `widths` / `sizes` / `loading`（首屏 eager，其余 lazy）；画廊大图同样遵守。
- SEO：所有页面经 `Layout` 获得 canonical / OG / Twitter / JSON-LD；新增页面不要绕过；OG 图优先沿用现有动态生成链路。
- Lighthouse 关注点：保持语义化标题层级、避免重复事件监听、避免直出大图、保持 body 背景色与主题同步。
- 搜索与构建强耦合：修改正文结构或 `data-pagefind-body` / `data-pagefind-ignore` 标记后，必须跑一次 `pnpm run build` 验证索引。

# Code Guidelines

- TypeScript strict；优先使用 `CollectionEntry<"blog" | "galleries">` 与 content schema 推导的类型，不写 `any`（`Layout.astro` 中既有的 `structuredData?: any` 是历史遗留，新代码避免）。
- 命名：组件 `PascalCase.astro`；工具函数 camelCase；配置常量集中在 `SITE` / `constants.ts`。
- 禁止 `console.log`（ESLint `no-console` 为 error）；调试代码完成后必须删除。
- 路径别名 `@/*` → `src/*`。
- 文件组织：页面 / 布局 / 组件 / 工具 / 样式各归其位，不要跨目录放置。
- 错误处理：异步加载（如 Pagefind）做存在性判断与幂等保护；所有 DOM 操作前判空；事件监听用 `AbortController` 管理并在 `astro:page-load` 重建。

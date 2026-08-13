# Project Overview

Margin（原 Devosfera）：基于 AstroPaper 深度二次开发的个人博客（纯静态站点，作者：白雾茫茫丶，域名：https://baiwumm.com）。项目定位是「个人技术博客 + 图片画廊」，当前主要目标是在保持静态生成、页面性能与既有视觉体系（终端/赛博朋克风格、玻璃拟态、Aurora 光效）的前提下，持续扩展和维护博客内容、画廊、全局搜索、SEO 与 OG 图等既有能力，不做架构性重写。

关键事实：仓库提交历史很浅（当前仅 2 个提交）、无自动化测试、无 CI workflow；所有改动依赖 `astro check` + 构建与人工验证。当前处于「先理解、后修改」的长期 AI 协作模式，任何修改前先阅读本文件与相关代码。

# 修改原则

遵循「最小修改原则」。

在修改代码之前：

1. 先理解现有实现。
2. 查找项目中是否已经存在类似实现。
3. 优先复用现有组件、工具和设计模式。
4. 没有必要时不要新增依赖。
5. 不进行与当前需求无关的重构。
6. 不主动改变项目架构。

实现功能时，不要顺便「优化」无关代码。

如果发现明显可以改进但与当前需求无关的问题，只记录，不要主动修改。

# Tech Stack

- Astro 6（SSG 静态生成），使用 `astro:content`、`astro:transitions`（View Transitions + hover 预取）、`astro:env`、本地字体 API
- TypeScript 6，配置为 `astro/tsconfigs/strict`
- Tailwind CSS 4（CSS-first 模式）：`@import "tailwindcss"` + `@theme inline`，通过 `@tailwindcss/vite` 插件接入
- `@tailwindcss/typography`（`app-prose` 文章排版）
- `@astrojs/mdx`：MDX 内容支持，`extendMarkdownConfig: true`
- 内容集合：`astro:content` + glob loader（`blog` 与 `galleries` 两个集合，schema 在 `src/content.config.ts`）
- 代码高亮：Shiki（Astro 内置，双主题） + `@shikijs/transformers` + 自定义 `transformerFileName`
- 搜索：Pagefind 1.5（构建期生成索引） + `@pagefind/default-ui`（弹窗 / 搜索页 / 文章列表三处）
- 动态 OG 图：Satori + `@resvg/resvg-js`（帖子 / 站点 / 标签三类模板）
- SEO：`@astrojs/sitemap`、`@astrojs/rss`、Layout 内 JSON-LD / OpenGraph / Twitter meta
- 工具库：dayjs（utc/timezone 插件）、slugify、lodash.kebabcase；Markdown 插件 remark-toc、remark-collapse
- 包管理 pnpm；ESLint（`no-console` 为 error）+ Prettier（astro / tailwind 插件）
- 无 React / Vue 等框架组件，全部组件为 Astro Component

# Architecture

- 布局三层：`Layout.astro`（唯一根布局：head / SEO / 主题初始化 / 全局 backdrop / 全局 SearchModal）→ `Main` / `PostDetails` / `AboutLayout` → 各页面。新页面必须经过 `Layout`。
- 页面全部在 `src/pages` 静态生成：文章 `/posts/<slug>/`、画廊 `/galleries/<slug>/`、标签 `/tags/<tag>/`、分页 `/posts/2/` 等；另有 `rss.xml`、`robots.txt`、`og.png` 等端点。
- 内容与代码分离：文章/画廊在 `src/data`，schema 在 `src/content.config.ts`，路由不感知具体内容文件。
- 工具函数集中在 `src/utils`（排序 / 过滤 / slug / 路径 / OG / 阅读时间 / 音频 store）。
- 客户端脚本全部写在 Astro 组件 `<script>` 内，统一模式：`astro:page-load` 初始化 + `AbortController` 清理 + 防重复绑定（View Transitions 兼容）。
- 全局配置在 `src/config.ts` 的 `SITE`（含所有功能开关）；社交链接与「编辑本文」URL 来自环境变量 `PUBLIC_*`，禁止硬编码。
- 搜索链路：`pnpm build` 时 `pagefind --site dist` → 拷贝到 `public/pagefind` → 浏览器端 PagefindUI 消费。

# Directory Structure

只列出重要目录：

```
src/
  config.ts            # SITE 全局配置与功能开关（改站点行为先看这里）
  content.config.ts    # blog / galleries 集合的 Zod schema
  constants.ts         # 社交链接、分享链接（URL 来自 env）
  assets/              # 字体（woff2/ttf，由 astro.config.ts 注册）、SVG 图标、logo
  data/blog/           # 文章 .md / .mdx（扁平存放）
  data/galleries/      # 每个画廊一个文件夹：index.md + 图片
  layouts/             # Layout / Main / PostDetails / AboutLayout
  pages/               # 路由页面与端点（og / rss / robots）
  components/          # 可复用 Astro 组件
  styles/              # global.css（tokens / 搜索样式）、typography.css（app-prose）
  utils/               # 内容处理、OG 生成、音频 store、工具
  scripts/theme.ts     # 主题切换逻辑
public/                # 静态资源（favicon / og / audio）；pagefind 生成物不入库
astro.config.ts        # 站点 / 集成 / Markdown / Shiki / 字体 / env schema
```

# Development Commands

- 安装依赖：`pnpm install`
- 开发：`pnpm run dev`（localhost:4321；搜索索引需先 build 一次）
- 构建：`pnpm run build`（= `astro check` + `astro build` + `pagefind --site dist` + 拷贝索引到 `public/pagefind`）
- 预览：`pnpm run preview`
- 类型同步：`pnpm run sync`（`astro sync`）
- Lint：`pnpm run lint`
- Format 检查 / 格式化：`pnpm run format:check` / `pnpm run format`
- 直接调用 Astro CLI：`pnpm run astro`

注意：`format` 会格式化整个项目，日常改动不要整仓执行，只格式化改动的文件。

# Content System

- **创建文章**：在 `src/data/blog/` 新建 `<slug>.md` 或 `.mdx`，按 schema 写 frontmatter 即可；无需修改路由/配置，标签、RSS、sitemap、搜索、分页自动纳入。文件以下划线 `_` 开头会被 glob 忽略（不参与集合）。
- **URL / Slug**：文章 slug 即文件名（`/posts/<slug>/`，支持子目录并按目录段逐级 slugify）；标签 slug 由 `slugifyStr` 生成（拉丁字符 → slugify 小写连字符，含非拉丁字符 → lodash.kebabcase 保留原字符）；画廊 slug 即文件夹名（`/galleries/<slug>/`）。
- **Frontmatter（blog）**：`title`、`pubDatetime`（必填，ISO 日期）、`description`（必填）、`tags`（默认 `["others"]`）、`draft`、`featured`、`modDatetime`、`author`、`ogImage`（本地资源或远程 URL）、`coverImage`、`canonicalURL`、`hideEditPost`、`timezone`（覆盖 `SITE.timezone`）。
- **Content Collection**：`blog` 与 `galleries` 的字段以 `src/content.config.ts` 为准；新增字段必须同步 schema。
- **Markdown / MDX**：两者都支持；MDX 可直接写 JSX。文章目录（TOC）由标题自动生成并渲染在正文右侧吸顶栏（`src/components/TableOfContents.astro`），无需在正文添加标记；旧文章中的 `## Table of contents` 标记会被自动移除。
- **代码块扩展语法**（已有约定）：`// [!code highlight]`、`// [!code ++]` / `// [!code --]`、`// [!code word]`；在代码围栏语言标识后追加 `file=文件名`（如 `ts file=example.ts`）可显示文件名徽章。
- **图片**：本地图走 `astro:assets`（`Image` 组件，自动优化 / srcset / 格式转换）；远程图用普通 `<img>` 并带 alt；画廊图片通过 `import.meta.glob` 在构建期收集。文章卡片封面由 `SITE.showCoverImages` 控制（默认关闭），开启后按 `coverImage → ogImage → 动态 OG index.png` 的优先级取图。
- **Gallery**：在 `src/data/galleries/<slug>/` 放 `index.md` + 图片；frontmatter 为 `title / description / pubDatetime / draft / coverImage / tags`；图片按文件名排序（数字前缀控制顺序），alt 由文件名自动生成。MDX 中用 `<GalleryEmbed slug="..." cols limit showLink />` 内嵌（无需 import，PostDetails 已全局注册），**slug 必须与画廊文件夹名完全一致**。画廊的完整技术文档见根目录 `GALLERIES.md`。
- **Tags / Categories**：只有 Tags，无 Categories；标签页自动生成，新标签无需额外配置。
- **Draft**：`draft: true` 在构建产物中隐藏（列表 / 详情 / RSS / sitemap），dev 下可见；定时发布按 `SITE.timezone` + `scheduledPostMargin`（15 分钟）计算。

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

# Content Guidelines

- 本项目只用中文：界面文案、内容、元信息、日期一律使用中文（`SITE.lang` 为 `zh-CN`），不要新增英文界面文案；注意 `archives` 页的月份名是硬编码西班牙语（历史遗留），改文案时一并改为中文；提交信息按「提交规则」以中文优先。
- 不硬编码个人数据：社交链接、编辑 URL 一律走 `PUBLIC_*` 环境变量；作者名等默认值来自 `SITE`。
- MDX 允许自定义 JSX（已有先例），类名使用 Tailwind 语义类或组件 `<style>`，不要引入内联样式库。
- `GalleryEmbed` 的 slug 必须与 `src/data/galleries/` 下的文件夹名完全一致；引用不存在的 slug 会渲染错误提示块。
- 远程图片必须带 alt，优先稳定图源。
- 修改已有文章：保留 `pubDatetime`；实质性更新时补充/更新 `modDatetime`。

# Code Guidelines

- TypeScript strict；优先使用 `CollectionEntry<"blog" | "galleries">` 与 content schema 推导的类型，不写 `any`（`Layout.astro` 中既有的 `structuredData?: any` 是历史遗留，新代码避免）。
- 命名：组件 `PascalCase.astro`；工具函数 camelCase；配置常量集中在 `SITE` / `constants.ts`。
- 禁止 `console.log`（ESLint `no-console` 为 error）；调试代码完成后必须删除。
- 路径别名 `@/*` → `src/*`。
- 文件组织：页面 / 布局 / 组件 / 工具 / 样式各归其位，不要跨目录放置。
- 错误处理：异步加载（如 Pagefind）做存在性判断与幂等保护；所有 DOM 操作前判空；事件监听用 `AbortController` 管理并在 `astro:page-load` 重建。

# 提交规则

- 提交信息使用 Conventional Commits 格式（与 `cz.yaml` 的 commitizen 约定一致）：`类型: 描述`，类型如 `feat` / `fix` / `docs` / `refactor` / `style` / `chore` 等。
- **提交描述以中文优先**：用简洁中文一句话说明改动，例如 `fix: 修复搜索弹窗在移动端无法关闭的问题`。
- 有明确作用域时写 `类型(scope): 描述`（如 `docs(agents): ...`），无作用域时省略。
- 一次提交只包含一个逻辑改动，不把无关改动混入同一提交。

# Modification Rules

- 不随意修改基础架构：`astro.config.ts`、`content.config.ts`、`Layout.astro`、`src/config.ts` 是地基，改动前必须说明理由并验证全站。
- 不升级 / 不新增依赖：确有必要时先在交付说明中列明，由用户决定；不擅自替换现有技术栈。
- 不删除现有功能与配置开关；改动保持向后兼容（新行为默认关闭或默认值不变）。
- 修改前先理解调用关系：用 `rg` 查找目标文件的所有引用，确认数据流再动手。
- 最小改动：优先局部补丁，不重构无关代码，不整仓格式化。
- 修改完成后运行 `pnpm run build`（含 `astro check`）；涉及样式/交互的改动人工验证 light / dark 与移动端表现。

# AI Workflow

每次开发任务按以下顺序执行：

1. **理解需求**：明确要改什么、影响哪些页面与内容。
2. **检查相关代码**：读目标文件及其调用方，确认现有行为。
3. **找到现有实现**：优先复用既有组件、工具函数与设计模式。
4. **制定最小修改方案**：列出改动点、影响面与验证方式。
5. **修改**：只改必要文件，遵循本文件全部约定。
6. **检查**：运行 `pnpm run build`（含 `astro check`），必要时 `pnpm run lint`。
7. **总结**：说明改了什么、依赖项、验证结果与遗留事项。

# Important Notes

- **搜索索引只在 build 后存在**：`public/pagefind` 被 gitignore，全新 clone 后 dev 环境搜索不可用，需先 `pnpm run build`；dev 下页面会显示「先 build」提示。
- **画廊图片 glob 在 4 处重复**：`src/pages/galleries/index.astro`、`src/pages/galleries/[gallery].astro`、`src/components/Card.astro`、`src/components/GalleryEmbed.astro`；新增图片格式（如 `.HEIC`）需要四处同步。
- **已知缺陷**：`src/data/blog/urban-city-photography.mdx` 中 `<GalleryEmbed slug="fotografia-urbana">` 与真实画廊目录 `urban-photography` 不匹配，会渲染「Gallery not found」错误块；修复或创作新内容时避免此类不一致。
- **主题初始化**：`Layout.astro` 内联 FOUC 脚本默认跟随系统偏好，而 `src/scripts/theme.ts` 内部默认值为 `dark`，正常运行依赖内联脚本先执行；改动初始化顺序会引入闪变（FOUC）。
- **搜索索引的复制是跨平台的**：`build` 脚本用 Node 的 `fs.cpSync` 把 `dist/pagefind` 复制到 `public/pagefind`（Windows / Linux 均可），dev 下搜索需先 build 一次。
- **生产构建依赖 devDependencies**：`@tailwindcss/typography`、`@pagefind/default-ui` 位于 devDependencies 但生产构建需要，CI 安装不要用 `--prod`。
- **无自动化测试**：改动靠人工验证；View Transitions 下最常见的回归是事件监听器重复绑定。
- **提交历史很浅（当前仅 2 个提交）**：基本没有可回退的旧版本；重大改动前建议先提交或备份当前状态。
- **pnpm 原生依赖构建白名单**：`pnpm-workspace.yaml` 的 `allowBuilds` / `onlyBuiltDependencies` 已放行 esbuild 与 sharp；新增带原生构建脚本的依赖时必须同步该白名单（且按「修改原则」先征得用户同意）。
- **tsconfig 中的 `jsx: "react-jsx"` 是上游遗留**（项目无 React 依赖），不要据此引入 React 组件。
- 不要删除 `public/` 下被页面引用的资源（favicon、`devosfera-og.webp`、`audio/` 等）。

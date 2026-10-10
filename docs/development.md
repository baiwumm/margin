# 开发与技术架构

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 涉及技术栈、架构、目录结构与开发命令；改代码、动构建或依赖前先读本文。

# Tech Stack

- Astro 7（SSG 静态生成），使用 `astro:content`、`astro:transitions`（View Transitions + hover 预取）、`astro:env`、本地字体 API；Markdown 插件通过 `markdown.processor: unified({...})`（来自 `@astrojs/markdown-remark`）接入，不再使用已废弃的 `markdown.remarkPlugins` / `rehypePlugins`
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

- 换行符约定：全仓 LF。根目录 `.gitattributes`（`* text=auto eol=lf`）覆盖 Windows 的 `core.autocrlf`，保证检出后 `format:check` 可通过；不要删除或放宽该文件，也不要把行尾改回 CRLF。
- JSX 表达式块内不要写 HTML 注释 `<!-- -->`（babel 无法解析，会导致 prettier 报错并污染同进程后续文件的解析），使用 `{/* */}`。

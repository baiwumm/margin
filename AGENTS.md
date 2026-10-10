# Project Overview

Margin（原 Devosfera）：基于 AstroPaper 深度二次开发的个人博客（纯静态站点，作者：白雾茫茫丶，域名：https://baiwumm.com）。项目定位是「个人技术博客 + 图片画廊」，当前主要目标是在保持静态生成、页面性能与既有视觉体系（终端/赛博朋克风格、玻璃拟态、Aurora 光效）的前提下，持续扩展和维护博客内容、画廊、全局搜索、SEO 与 OG 图等既有能力，不做架构性重写。

关键事实：仓库提交历史较短（当前约 70 个提交）、无自动化测试；唯一 CI 是 tag 触发的发版 workflow（`.github/workflows/release.yml`：lint / build 预检 + 创建草稿 Release，不部署）；改动仍依赖 `astro check` + 构建与人工验证。当前处于「先理解、后修改」的长期 AI 协作模式，任何修改前先阅读本文件与相关代码。

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

# Content System

- **创建文章**：在 `src/data/blog/` 新建 `<slug>.md` 或 `.mdx`，按 schema 写 frontmatter 即可；无需修改路由/配置，标签、RSS、sitemap、搜索、分页自动纳入。文件以下划线 `_` 开头会被 glob 忽略（不参与集合）。
- **文章图片与文件结构**：文章有本地图片时必须采用「`<slug>/index.md` + 图片」的单文件夹结构（与画廊一致），禁止「`<slug>.md` + `<slug>/` 图片文件夹」并存；无图片的文章可以保持平铺 `<slug>.md`。
- **URL / Slug**：文章 slug 即文件名（文件夹结构时即文件夹名，`/posts/<slug>/`，支持子目录并按目录段逐级 slugify）；标签 slug 由 `slugifyStr` 生成（拉丁字符 → slugify 小写连字符，含非拉丁字符 → lodash.kebabcase 保留原字符）；画廊 slug 即文件夹名（`/galleries/<slug>/`）。
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

- 本项目只用中文：界面文案、内容、元信息、日期一律使用中文（`SITE.lang` 为 `zh-CN`），不要新增英文界面文案；注意 `archives` 页月份名此前为硬编码西班牙语，现已改为中文，改动时保持中文；提交信息按「提交规则」以中文优先。
- 不硬编码个人数据：社交链接、编辑 URL 一律走 `PUBLIC_*` 环境变量；作者名等默认值来自 `SITE`。
- MDX 允许自定义 JSX（已有先例），类名使用 Tailwind 语义类或组件 `<style>`，不要引入内联样式库。
- `GalleryEmbed` 的 slug 必须与 `src/data/galleries/` 下的文件夹名完全一致；引用不存在的 slug 会渲染错误提示块。
- 远程图片必须带 alt，优先稳定图源。
- **标签规则**：文章 / 画廊未写 `tags` 时，AI 必须根据正文或图片内容自动生成标签（中文优先、语义化），不得留空或依赖默认值；已有标签的保持原样，用户要求调整时按内容重新生成。Tag 的数量、粒度与生成标准遵循下方「文章 Metadata 规则」。
- **描述规则**：文章未写 `description` 时，AI 必须根据正文内容自动生成，不得留空或依赖默认值；已有 `description` 的保持原样，用户要求调整时再修改。描述格式与内容要求遵循下方「文章 Metadata 规则」。
- **文章命名规则**：文章文件名（即 slug）若无明确规定，统一使用 8 位「数字 + 小写字母」随机组合命名（参考现有文章 `r4ACa87S.md` 的 8 位随机风格，统一小写），不写中文或冗长英文描述；该文章的图片目录随文件名同步命名。
- **图片命名规则**：本地图片（文章 `coverImage` / `ogImage` / 正文图片 / 画廊图片）统一使用「数字前缀 + 语义化短名」，如 `01-city-street.jpg`；画廊图片按文件名排序展示，需要控制顺序时用 `01-`、`02-` 数字前缀。禁止保留上传时的无意义文件名（如 `IMG_4532.jpg`）。**命名由 AI 负责**：创作 / 整理文章或画廊时，AI 按本规则将图片重命名后放入对应目录，无需用户手动改名；用户上传的原始文件名仅作内容参考。格式支持 jpg / jpeg / png / webp / avif / gif（画廊同时兼容大写 JPG / JPEG / PNG / WEBP），不支持 `.HEIC`（需先转换）。画廊图片的 alt 由文件名自动生成（去扩展名与数字前缀、`-` / `_` 转空格、首字母大写），命名必须语义化以便得到可读 alt；文章图片 alt 手写，同样遵循语义化。
- 修改已有文章：保留 `pubDatetime`；实质性更新时补充/更新 `modDatetime`。

# 文章 Metadata 规则

AI 在生成文章 Metadata 时，需要生成：

- `title`
- `description`
- `tags`

博客没有固定的文章分类，因此 Tags 同时承担文章主题索引和内容关联的作用。

> 本规则是文章 Metadata 的权威标准：与 Content Guidelines 中的其他规则冲突时，以本规则为准。

## Title

- 标题必须准确概括文章的核心内容。
- 优先使用自然、简洁的中文表达。
- 不为了 SEO 刻意堆砌关键词。
- 技术名称、产品名称使用常见或官方名称。
- 避免使用“深度解析”“全面总结”“保姆级教程”等夸张、模板化表达。
- 标题应体现文章真正讨论的主题，而不是简单罗列文章中的关键词。

## Description

- 如果是文章，必须以「这篇文章」开头。
- 使用 1～2 句话概括文章的主要内容。
- 应说明这篇文章主要写了什么、讨论了什么或记录了什么。
- 不要简单重复标题。
- 不要罗列 Tags。
- 不要使用“本文将带你……”等模板化表达。
- 不要加入文章中没有明确表达的观点。
- 描述应自然、简洁，通常控制在 30～100 字。

例如：

正确：

> 这篇文章记录了春节前最后一个工作日的加班经历，也聊到了工作压力、职场变化以及一些生活上的感受。

错误：

> 本文介绍了春节、加班、职场、生活等相关内容。

## Tags

Tags 用于描述文章的核心主题，而不是收集文章中出现过的关键词。

### 核心原则

判断一个词是否应该成为 Tag 时，优先考虑：

> “如果以后博客里有很多篇文章，这个 Tag 能不能帮助读者找到与这篇文章主题相近的其他文章？”

如果只是文章中的一个细节、场景、时间、地点或偶然出现的关键词，则不要轻易创建 Tag。

### Tag 数量

- 每篇文章通常生成 1～3 个 Tags。
- 内容较丰富时最多 4 个。
- 不要求凑够数量。
- 如果文章只有一个明确主题，只生成 1 个 Tag。
- 宁可少生成，也不要为了增加 Tags 而拆分主题。

### Tag 粒度

优先选择能够概括文章主要内容的词，而不是过于细碎的关键词。

例如：

文章：

> 春节期间晚上去湛江金沙湾观海长廊散步，记录沿途的夜景和城市变化。

推荐：

> 湛江、旅行

不推荐：

> 湛江、夜景、春节、观海长廊、自驾游、自然风光

因为“夜景”“春节”“自然风光”只是文章中的具体情境，并不是文章需要长期索引的核心主题。

### Tag 应该关注什么

可以从以下内容中选择合适的 Tag，但不要求每个维度都选择：

1. 文章讨论的核心主题
2. 文章涉及的重要技术、工具或产品
3. 文章长期具有价值的兴趣领域
4. 文章明确围绕的人物、地点或事件
5. 文章持续讨论的生活主题或经验

例如：

技术文章：

> JavaScript、迭代器

AI 文章：

> Claude Code、AI 编程

旅行文章：

> 湛江、旅行

生活随笔：

> 生活、随笔

年度总结：

> 年终总结

### 不要把以下内容机械地作为 Tag

除非它本身就是文章的核心主题，否则不要因为文章出现以下内容就创建 Tag：

- 时间：2024、春节、周末、年前
- 情境：夜景、加班、下班、散步
- 内容形式：记录、分享、随笔、总结
- 泛化词：生活、技术、开发、编程、互联网
- 文章中的某个细节
- 仅出现一次的技术名词
- 版本号
- 与文章核心主题关系较弱的关键词

### 关于地点、人物和事件

地点、人物或事件可以成为 Tag，但必须满足：

> 文章本身就是围绕这个地点、人物或事件展开。

例如：

> 《夜游湛江——金沙湾观海长廊》

可以使用：

> 湛江、旅行

但如果一篇技术文章只是顺带提到“我在深圳出差时遇到了这个问题”，不要因为出现“深圳”就添加 `深圳` Tag。

### 关于技术文章

技术文章不要把技术栈中的每一个词都作为 Tag。

例如文章：

> Next.js 中使用 SWR 管理客户端数据请求

推荐：

> Next.js、SWR

而不是：

> Next.js、React、JavaScript、TypeScript、SWR、Hooks、数据请求、前端开发、客户端

只有当某个技术、工具或概念是文章的重要讨论对象时，才应该作为 Tag。

### Tag 复用

优先复用已有的 Tag。

如果新 Tag 与已有 Tag 表达的是相同或高度相近的概念，应使用已有 Tag，而不是创建新的写法。

例如：

- `Next` → `Next.js`
- `NextJS` → `Next.js`
- `React.js` → `React`
- `Tailwind` → `Tailwind CSS`
- `Github` → `GitHub`

但不要为了强制复用而使用明显不准确的 Tag。

### 新 Tag

允许创建新的 Tag。

如果文章确实出现了一个新的、明确且具有独立主题价值的概念，可以创建新的 Tag。

不要因为“这个词很具体”就认为它应该成为 Tag。

一个 Tag 即使当前只有一篇文章也没有问题，只要它本身是一个明确、有意义、未来可能继续使用的主题。

### 最终判断

生成 Tags 前，对每个候选 Tag 依次判断：

1. 它是不是这篇文章的重要主题？
2. 删除这个 Tag 后，是否会明显损失文章的主题索引能力？
3. 它是否只是文章中的一个细节或关键词？
4. 它未来是否有可能用于关联其他文章？
5. 是否存在含义相同的已有 Tag？

只有通过判断的 Tag 才保留。

最终 Tags 应当体现：

> **这篇文章“主要讲什么”，而不是这篇文章“出现过什么”。**

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

# 发布说明（Release Notes）规范

- 发版操作：更新根 `package.json` 的 `version` → 提交后打 tag 并推送（`git tag vX.Y.Z && git push origin main vX.Y.Z`）→ CI 预检（lint / build）通过后自动创建草稿 Release → 人工按本规范编辑草稿正文后发布；README 版本徽章为动态徽章，无需手动改（详见 `.github/workflows/release.yml` 头部注释）。
- 发布说明使用中文，结构为「`## emoji + 主题小节` + 无序列表」，结尾固定标注版本号。
- 小节按本次变更的板块命名，标题使用二级标题并搭配 emoji（如 `## 🚀 关于页重构` / `## ✨ 体验优化` / `## 🧹 其他`），不使用三级标题。
- 每条改动一句话、以 `- ` 开头，保持简洁；小节内顺序按重要程度排列。
- 结尾必须包含 `- 版本号升至 vX.Y.Z`。
- 参考模板（v1.1.0）：

```markdown
## 🚀 关于页重构

- 接入作者真实头像
- 专业技能：品牌图标无限滚动（React / Vue / Next.js / NestJS / TypeScript / Prisma / PostgreSQL 等）
- 成长足迹：横向时间轴
- 兴趣与生活：图标化展示
- 人格档案：16Personalities（INTJ-A）真实测试数据
- 十年之约：建站进度条（2023.04.29 → 2033.04.29）
- 页尾评论区、友链与联系方式

## ✨ 体验优化

- 回到顶部按钮全站启用，滚动超过一屏后显示，带平滑过渡动画
- 移动端菜单补齐 Help（快捷键面板），统一 Preferences 字号与出场动画
- 阅读模式入口图标悬停动画
- 首页 Written by 与作者名间距

## 🧹 其他

- 关闭「编辑本文」按钮，移除 PUBLIC_EDIT_POST_URL
- 版本号升至 v1.1.0
```

# Modification Rules

- 不随意修改基础架构：`astro.config.ts`、`content.config.ts`、`Layout.astro`、`src/config.ts` 是地基，改动前必须说明理由并验证全站。
- 不升级 / 不新增依赖：确有必要时先在交付说明中列明，由用户决定；不擅自替换现有技术栈。**已批例外**：`pinyin-pro`（devDependency，仅小程序导出管线 `src/utils/export/` 构建期使用，D29）。
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
- **已知缺陷**：此前 `urban-city-photography.mdx` 中 `<GalleryEmbed slug="fotografia-urbana">` 与真实画廊目录 `urban-photography` 不匹配的问题，已随该文章删除而消失；创作新内容时仍须保证 `GalleryEmbed` 的 slug 与画廊文件夹名完全一致，避免渲染「Gallery not found」错误块。
- **主题初始化**：`Layout.astro` 内联 FOUC 脚本默认跟随系统偏好，而 `src/scripts/theme.ts` 内部默认值为 `dark`，正常运行依赖内联脚本先执行；改动初始化顺序会引入闪变（FOUC）。
- **品牌资产的真实对应关系**：`src/assets/logo/margin.svg` 是 `Ba{·}wumm` 文字商标（花括号 + 中心点，viewBox 已贴紧墨迹为 `136 36 733 145`），`src/assets/logo/mark.svg` 才是方形「版心」标记，两者在 Header / Footer 组成横排 lockup。站点图标只有 `public/favicon.svg` 与 `public/apple-touch-icon.png`（后者靠 iOS 根目录约定被自动发现，`Layout.astro` 内没有对应 `<link>`）。原 `public/logo.png` 因全仓无引用已删除，不要再当它是站点图标。
- **logo 上色依赖 Astro 把 `.svg` 内联**：`.logo-mark-block` 与 `.logo-sphere path`（文字商标的花括号）在 `global.css` 里吃 `var(--accent)`，外框与字母走 `currentColor`；成立前提是 import 的 SVG 被原样注进 DOM（可在 `dist/*.html` 里直接 grep 到 `logo-mark-block` 验证）。若改成 `<img src="/...svg">` 引用，CSS 变量与 `currentColor` 会整体失效。
- **accent 默认值决定在 FOUC 内联脚本里**：`Layout.astro` 内联脚本按 `localStorage`（用户手动选过）> `sessionStorage`（本标签页会话已抽过）> 五档等概率随机的顺序写 `data-accent`，随机值只写 `sessionStorage`、不占用 `localStorage`；`theme.ts` 的 `DEFAULT_ACCENT = "blue"` 仅是内联脚本未执行时的兜底。**副作用**：首次访问的强调色是非确定的，截图或走查需要稳定颜色时先在控制台执行 `localStorage.setItem("accent", "blue")` 再刷新。
- **favicon 跟不了 `data-accent`，只能 JS 重算**：`theme.ts` 的 `reflectFavicon()` 读运行时 `--accent` 生成 data URL 覆盖 `link[rel=icon]`，挂在 `reflectAccent()` 与 `reflectPreference()` 上（accent 明暗两态色值不同，主题切换也要重算）。静态 `public/favicon.svg` 只负责首屏与无 JS，其外框深浅用 SVG 内 `@media (prefers-color-scheme)` 跟随**浏览器**而非站点 `data-theme`，否则标签页底色与描边同色会让图标看不见。`apple-touch-icon.png` 保留不透明深底板（iOS 读静态 PNG，透明底会被填黑）。
- **搜索索引的复制是跨平台的**：`build` 脚本用 Node 的 `fs.cpSync` 把 `dist/pagefind` 复制到 `public/pagefind`（Windows / Linux 均可），dev 下搜索需先 build 一次。
- **生产构建依赖 devDependencies**：`@tailwindcss/typography`、`@pagefind/default-ui` 位于 devDependencies 但生产构建需要，CI 安装不要用 `--prod`。
- **无自动化测试**：改动靠人工验证；View Transitions 下最常见的回归是事件监听器重复绑定。
- **提交历史较短（当前约 70 个提交）**：基本没有可回退的旧版本；重大改动前建议先提交或备份当前状态。
- **pnpm 原生依赖构建白名单**：`pnpm-workspace.yaml` 的 `allowBuilds` / `onlyBuiltDependencies` 已放行 esbuild 与 sharp；新增带原生构建脚本的依赖时必须同步该白名单（且按「修改原则」先征得用户同意）。
- **tsconfig 中的 `jsx: "react-jsx"` 是上游遗留**（项目无 React 依赖），不要据此引入 React 组件。
- 不要删除 `public/` 下被页面引用的资源（favicon、`default-og.webp`、`audio/` 等）。

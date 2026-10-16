# 内容系统与创作规范

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 涉及内容系统、创作规范与文章 Metadata（title / description / tags）规则；创建或修改文章、画廊前必读。

# Content System

- **创建文章**：在 `src/data/blog/` 新建 `<slug>.md` 或 `.mdx`，按 schema 写 frontmatter 即可；无需修改路由/配置，标签、RSS、sitemap、搜索、分页自动纳入。文件以下划线 `_` 开头会被 glob 忽略（不参与集合）。
- **文章图片与文件结构**：文章有本地图片时必须采用「`<slug>/index.md` + 图片」的单文件夹结构（与画廊一致），禁止「`<slug>.md` + `<slug>/` 图片文件夹」并存；无图片的文章可以保持平铺 `<slug>.md`。
- **URL / Slug**：文章 slug 即文件名（文件夹结构时即文件夹名，`/posts/<slug>/`，支持子目录并按目录段逐级 slugify）；标签 slug 由 `slugifyStr` 生成（拉丁字符 → slugify 小写连字符，含非拉丁字符 → lodash.kebabcase 保留原字符）；画廊 slug 即文件夹名（`/galleries/<slug>/`）。
- **Frontmatter（blog）**：`title`、`pubDatetime`（必填，ISO 日期）、`description`（必填）、`tags`（默认 `["others"]`）、`draft`、`featured`、`modDatetime`、`author`、`ogImage`（本地资源或远程 URL）、`coverImage`、`canonicalURL`、`hideEditPost`、`timezone`（覆盖 `SITE.timezone`）。
- **Content Collection**：`blog` 与 `galleries` 的字段以 `src/content.config.ts` 为准；新增字段必须同步 schema。
- **Markdown / MDX**：两者都支持；MDX 可直接写 JSX。文章目录（TOC）由标题自动生成并渲染在正文右侧吸顶栏（`src/components/TableOfContents.astro`），无需在正文添加标记；旧文章中的 `## Table of contents` 标记会被自动移除。
- **代码块扩展语法**（已有约定）：`// [!code highlight]`、`// [!code ++]` / `// [!code --]`、`// [!code word]`；在代码围栏语言标识后追加 `file=文件名`（如 `ts file=example.ts`）可显示文件名徽章。
- **图片**：本地图走 `astro:assets`（`Image` 组件，自动优化 / srcset / 格式转换）；远程图用普通 `<img>` 并带 alt；画廊图片通过 `import.meta.glob` 在构建期收集。文章卡片封面由 `SITE.showCoverImages` 控制（默认关闭），开启后按 `coverImage → ogImage → 动态 OG index.png` 的优先级取图。
- **Gallery**：在 `src/data/galleries/<slug>/` 放 `index.md` + 图片；frontmatter 为 `title / description / pubDatetime / draft / coverImage / tags`；图片按文件名排序（数字前缀控制顺序），alt 由文件名自动生成。MDX 中用 `<GalleryEmbed slug="..." cols limit showLink />` 内嵌（`PostDetails` 渲染 MDX 时经 `components` 注入，无需再 import），**slug 必须与画廊文件夹名完全一致**。画廊的完整技术文档见 [docs/galleries.md](./galleries.md)。
- **Tags / Categories**：只有 Tags，无 Categories；标签页自动生成，新标签无需额外配置。
- **Draft**：`draft: true` 在构建产物中隐藏（列表 / 详情 / RSS / sitemap），dev 下可见；定时发布按 `SITE.timezone` + `scheduledPostMargin`（15 分钟）计算。

# Content Guidelines

- 本项目只用中文：界面文案、内容、元信息、日期一律使用中文（`SITE.lang` 为 `zh-CN`），不要新增英文界面文案；注意 `archives` 页月份名此前为硬编码西班牙语，现已改为中文，改动时保持中文；提交信息按「提交规则」以中文优先（见 [docs/release.md](./release.md)）。
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

# 工程注意事项（Important Notes）

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 记录已知陷阱、隐式约定与历史决策；**任何修改前应扫读一遍**，避免踩中前人已经踩过的坑。

- **搜索索引只在 build 后存在**：`public/pagefind` 被 gitignore，全新 clone 后 dev 环境搜索不可用，需先 `pnpm run build`；dev 下页面会显示「先 build」提示。
- **画廊图片 glob 4 处重复，扩展名清单以本条为权威**：渲染侧四处为 `src/pages/galleries/index.astro`、`src/pages/galleries/[gallery].astro`、`src/components/Card.astro`、`src/components/GalleryEmbed.astro`，现值 `.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}`。新增一种扩展名时四处需同步，小程序导出管线 `src/utils/export/` 中同样清单的两处 glob（`images.ts` / `collections.ts`）也要保持一致；`docs/content.md` 的格式清单需相应更新（当前口径不支持 `.HEIC`，需先转换）。
- **已知缺陷**：此前 `urban-city-photography.mdx` 中 `<GalleryEmbed slug="fotografia-urbana">` 与真实画廊目录 `urban-photography` 不匹配的问题，已随该文章删除而消失；创作新内容时仍须保证 `GalleryEmbed` 的 slug 与画廊文件夹名完全一致，避免渲染「Gallery not found」错误块。
- **主题初始化**：`Layout.astro` 内联 FOUC 脚本默认跟随系统偏好，而 `src/scripts/theme.ts` 内部默认值为 `dark`，正常运行依赖内联脚本先执行；改动初始化顺序会引入闪变（FOUC）。
- **品牌资产的真实对应关系**：`src/assets/logo/margin.svg` 是 `Ba{·}wumm` 文字商标（花括号 + 中心点，viewBox 已贴紧墨迹为 `136 36 733 145`），`src/assets/logo/mark.svg` 才是方形「版心」标记，两者在 Header / Footer 组成横排 lockup。站点图标只有 `public/favicon.svg` 与 `public/apple-touch-icon.png`（后者靠 iOS 根目录约定被自动发现，`Layout.astro` 内没有对应 `<link>`）。`public/logo.png` 目前仍在仓库中但全仓无本地引用，不要把它当站点图标。
- **logo 上色依赖 Astro 把 `.svg` 内联**：`.logo-mark-block` 与 `.logo-sphere path`（文字商标的花括号）在 `global.css` 里吃 `var(--accent)`，外框与字母走 `currentColor`；成立前提是 import 的 SVG 被原样注进 DOM（可在 `dist/*.html` 里直接 grep 到 `logo-mark-block` 验证）。若改成 `<img src="/...svg">` 引用，CSS 变量与 `currentColor` 会整体失效。
- **accent 默认值决定在 FOUC 内联脚本里**：`Layout.astro` 内联脚本按 `localStorage`（用户手动选过）> `sessionStorage`（本标签页会话已抽过）> 五档等概率随机的顺序写 `data-accent`，随机值只写 `sessionStorage`、不占用 `localStorage`；`theme.ts` 的 `DEFAULT_ACCENT = "blue"` 仅是内联脚本未执行时的兜底。**副作用**：首次访问的强调色是非确定的，截图或走查需要稳定颜色时先在控制台执行 `localStorage.setItem("accent", "blue")` 再刷新。
- **favicon 跟不了 `data-accent`，只能 JS 重算**：`theme.ts` 的 `reflectFavicon()` 读运行时 `--accent` 生成 data URL 覆盖 `link[rel=icon]`，挂在 `reflectAccent()` 与 `reflectPreference()` 上（accent 明暗两态色值不同，主题切换也要重算）。静态 `public/favicon.svg` 只负责首屏与无 JS，其外框深浅用 SVG 内 `@media (prefers-color-scheme)` 跟随**浏览器**而非站点 `data-theme`，否则标签页底色与描边同色会让图标看不见。`apple-touch-icon.png` 保留不透明深底板（iOS 读静态 PNG，透明底会被填黑）。
- **搜索索引的复制是跨平台的**：`build` 脚本用 Node 的 `fs.cpSync` 把 `dist/pagefind` 复制到 `public/pagefind`（Windows / Linux 均可），dev 下搜索需先 build 一次。
- **生产构建依赖 devDependencies**：`@tailwindcss/typography`、`@pagefind/default-ui` 位于 devDependencies 但生产构建需要，CI 安装不要用 `--prod`。
- **无自动化测试**：改动靠人工验证；View Transitions 下最常见的回归是事件监听器重复绑定。
- **提交历史较短**：版本 tag 自 `v1.1.0` 起，重大改动前建议先提交或备份当前状态。
- **pnpm 原生依赖构建白名单**：`pnpm-workspace.yaml` 的 `allowBuilds` / `onlyBuiltDependencies` 已放行 esbuild 与 sharp；新增带原生构建脚本的依赖时必须同步该白名单（且按 AGENTS.md「修改原则」先征得用户同意）。
- **tsconfig 中的 `jsx: "react-jsx"` 是上游遗留**（项目无 React 依赖），不要据此引入 React 组件。
- 不要删除 `public/` 下被页面引用的资源（favicon、`default-og.webp`、`audio/` 等）。
- **画廊 Lightbox / GalleryEmbed 走的是 `astro:after-swap`，不是统一模式**：`src/pages/galleries/[gallery].astro` 与 `src/components/GalleryEmbed.astro` 的脚本挂在 `astro:after-swap` 上（画廊列表页 `galleries/index.astro` 用的是 `astro:page-load`）；不要按「统一模式」把它们改写掉，否则 View Transitions 切换后可能不初始化。

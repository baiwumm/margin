# Margin

白雾茫茫丶的个人技术博客 + 图片画廊，基于 [AstroPaper](https://github.com/satnaing/astro-paper) 深度二次开发，纯静态生成（SSG）。

在线地址：[https://baiwumm.com](https://baiwumm.com)

## 特性

- 终端 / 赛博朋克视觉：Aurora 光效、玻璃拟态、网格 + 噪点背景、鼠标辉光
- 全局搜索（⌘K / Ctrl+K）：Pagefind 静态索引，弹窗、搜索页、文章列表三处入口
- 图片画廊：构建期图片优化、原生 `<dialog>` lightbox、MDX 内嵌 `<GalleryEmbed>`
- 动态 OG 图：Satori + resvg 生成站点 / 文章 / 标签三类 OG 图片
- 完整 SEO：canonical、OpenGraph、Twitter Card、JSON-LD、Sitemap、RSS（含 XSL 样式页）
- 明暗双主题 + 5 种强调色（蓝 / 绿 / 紫 / 橙 / Rose）
- 阅读模式（`r` 键）、首页音频播放器、Giscus 评论、回到顶部进度环
- 文章与画廊混合内容流：首页 / 文章列表 / 归档 / 标签 / RSS 统一排序

## 技术栈

Astro 6（SSG）· TypeScript（strict）· Tailwind CSS 4 · MDX · Shiki 代码高亮 · Pagefind · Satori · dayjs · pnpm

## 开发

要求 Node.js 20+ 与 pnpm。

```bash
pnpm install        # 安装依赖
pnpm run dev        # 本地开发 http://localhost:4321
pnpm run build      # 类型检查 + 构建 + Pagefind 索引
pnpm run preview    # 预览生产构建
pnpm run lint       # ESLint
pnpm run format     # Prettier 格式化
```

> 搜索索引只在 `pnpm run build` 后生成（会复制到 `public/pagefind`），全新克隆后先 build 一次，dev 下搜索才可用。
> Docker 部署参考 `Dockerfile` / `docker-compose.yml`。
> 仓库内 `AGENTS.md` 记录了完整的开发规范与注意事项。

## 目录结构

```
public/             # 静态资源（favicon、giscus 字体等）
src/
  assets/           # 字体、图标、logo
  components/       # 可复用组件
  data/blog/        # 文章（.md / .mdx）
  data/galleries/   # 画廊（每目录一个，含 index.md + 图片）
  layouts/          # Layout / Main / PostDetails / AboutLayout
  pages/            # 路由与端点（og / rss / robots）
  styles/           # global.css / typography.css / hero-aurora.css
  utils/            # 内容处理、OG 生成、工具函数
astro.config.ts     # 站点配置、字体、Shiki、集成
```

## 字体

| 用途 | 字体 |
| --- | --- |
| 正文 | Maple Mono CN（本地子集化，Wotfard 兜底） |
| 代码 / 等宽 / 终端风 | Fira Code |
| 斜体 / 装饰 | Sriracha |
| OG 图（构建期） | Wotfard + Maple Mono CN（TTF） |

字体统一存放在 `public/giscus/fonts/`，主站与 Giscus 评论共用一份，避免重复。

## 写内容

### 文章

在 `src/data/blog/` 新建 `<slug>.md` / `.mdx`，frontmatter：

```yaml
---
title: "文章标题"
pubDatetime: 2026-01-15T10:00:00+08:00   # 必填，ISO 8601
description: "SEO 与卡片摘要"               # 必填
tags: ["astro"]
featured: false          # 首页精选（金色卡片）
draft: false             # 草稿（生产构建隐藏）
modDatetime: 2026-02-01T10:00:00+08:00    # 可选，实质更新时补充
timezone: "Asia/Shanghai" # 可选，覆盖 SITE.timezone
---
```

- 文章 slug 即文件名，路由自动生成；标签、RSS、Sitemap、搜索、分页自动纳入
- MDX 可直接使用组件；目录（TOC）由标题自动生成，无需手动添加
- 代码块支持 `// [!code highlight]`、`// [!code ++]` / `// [!code --]`，语言后追加 `file=文件名` 可显示文件名

### 画廊

在 `src/data/galleries/<slug>/` 放 `index.md` + 图片，slug 即 `/galleries/<slug>` 路由；图片按文件名排序（数字前缀控制顺序），构建期自动优化。详见 [GALLERIES.md](GALLERIES.md)。

MDX 内嵌画廊（无需 import）：

```mdx
<GalleryEmbed slug="画廊文件夹名" />
```

`slug` 必须与 `src/data/galleries/` 下的文件夹名完全一致，否则会渲染错误提示。

## 配置

- 站点配置集中在 `src/config.ts` 的 `SITE`：标题、描述、时区、功能开关（画廊 / 音频 / 阅读模式 / 封面图等）、分页数量
- 社交链接与 Giscus 评论参数来自环境变量（不硬编码个人数据）：复制 `.env.example` 为 `.env` 并填写；未设置的项自动隐藏对应入口
- Giscus 需配置 `PUBLIC_GISCUS_REPO` / `PUBLIC_GISCUS_REPO_ID` / `PUBLIC_GISCUS_CATEGORY` / `PUBLIC_GISCUS_CATEGORY_ID`，并在 `SITE.comments.enabled` 开启

## License

基于 [AstroPaper](https://github.com/satnaing/astro-paper)（MIT）二次开发。

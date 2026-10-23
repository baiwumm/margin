# Project Overview

Margin（原 Devosfera）：基于 AstroPaper 深度二次开发的个人博客（纯静态站点，作者：白雾茫茫丶，域名：https://baiwumm.com）。项目定位是「个人技术博客 + 图片画廊」，当前主要目标是在保持静态生成、页面性能与既有视觉体系（终端/赛博朋克风格、玻璃拟态、Aurora 光效）的前提下，持续扩展和维护博客内容、画廊、全局搜索、SEO 与 OG 图等既有能力，不做架构性重写。

关键事实：提交历史较短（版本 tag 自 `v1.1.0` 起，可回退）、无自动化测试；CI 有两个——手动触发的发版 workflow（`.github/workflows/release.yml`：lint / build 预检 + release-it 自动完成版本号、CHANGELOG、tag 与 GitHub Release 发布，不负责部署）与 push/PR 触发的图片压缩校验 workflow（`.github/workflows/image-check.yml`，兜底 pre-commit 钩子）；改动质量依赖 `astro check` + 构建与人工验证。本项目处于「先理解、后修改」的长期 AI 协作模式。

# 修改原则

1. **先理解再动手**：读目标文件及其调用方，用 `rg` 确认调用关系与数据流，再修改。
2. **优先复用**：查找项目中是否已存在类似实现；优先复用现有组件、工具和设计模式。
3. **最小改动**：优先局部补丁，不重构无关代码，不顺便「优化」，不整仓格式化；发现无关可改进点只记录不修改。
4. **地基与总架构**：`astro.config.ts`、`content.config.ts`、`Layout.astro`、`src/config.ts` 与整体架构不随意修改；确需改动时必须先说明理由并验证全站。
5. **向前兼容**：不删除现有功能与配置开关；新行为默认关闭，或默认值保持不变。
6. **依赖**：确有必要再新增 / 升级，且必须先在交付说明中列明、由用户决定。已批例外：`pinyin-pro`（devDependency，仅 `src/utils/export/` 导出管线构建期使用）。
7. **关联项目**：margin 与 `margin-app`（微信小程序）及 `margin-comments`（giscus 评论通知脚本）关联；改动若触碰被对方消费的数据形态或接口（`src/utils/export/` 导出产物、`src/pages/api/v1/site.json.ts`、`src/pages/comment-titles.json.ts`、与导出层共用的 Markdown 插件等），必须先评估 margin-app / margin-comments 是否需要同步改动，并把评估结论写进交付说明。两侧契约以 margin-app 仓库的 `docs/api-contract.md` 为准（触点清单见 docs/development.md「关联项目」）。

# AI Workflow

1. **理解需求**：明确要改什么、影响哪些页面与内容。
2. **检查与复用**：读目标文件及其调用方并寻找现有实现，按修改原则 1–3 执行。
3. **制定最小修改方案**：列出改动点、影响面与验证方式后再动手。
4. **修改**：只改必要文件，遵循本文件与 `docs/` 相关文档的全部约定。
5. **检查（本步骤完成判据）**：`pnpm run build`（含 `astro check`）退出码为 0；`pnpm run lint` 需要时也必须退出码 0，两项通过才算完成。
6. **总结**：说明改了什么、依赖项、验证结果与遗留事项。

# 文档索引（docs/）

本文件只保留总纲与最高频规则；专题规范按需阅读，**做对应类型的任务前必须先读对应文档**：

| 文档 | 内容 | 什么时候读 |
| --- | --- | --- |
| [docs/development.md](docs/development.md) | 技术栈、架构、目录结构、开发命令 | 改代码、动构建/依赖、排查构建问题前 |
| [docs/content.md](docs/content.md) | 内容系统、创作规范、文章 Metadata 规则、成文后去 AI 味 | 创建或修改文章 / 画廊、生成 title / description / tags、文章成文后 |
| [docs/ui-guidelines.md](docs/ui-guidelines.md) | 组件、样式、性能、代码规范 | 改 UI、写组件或客户端脚本前 |
| [docs/release.md](docs/release.md) | 提交规则、全自动发版流程 | 提交代码、执行发版前 |
| [docs/pitfalls.md](docs/pitfalls.md) | 已知陷阱、隐式约定与历史决策 | **任何修改前扫一遍**，避免重复踩坑 |
| [docs/galleries.md](docs/galleries.md) | 画廊功能完整技术文档 | 深入定制或排查画廊功能时 |

# 核心红线速览

以下规则违反代价最高，始终生效（细节见对应专题文档）：

- 全站只用中文：内容、元信息、日期一律中文；提交信息也是中文优先。**例外（2026-10-20 拍板，特意设计）**：导航等界面术语保留英文（Posts / About / Projects / Friends / Archives / Galleries / Moments / Search），属双语视觉语言，勿将其「中文化」；新增界面文案仍优先中文（→ docs/content.md、docs/release.md）。
- 不硬编码个人数据：社交链接、编辑 URL 一律走 `PUBLIC_*` 环境变量（→ docs/content.md）。
- 新增依赖前先按修改原则 6 征得同意；不引入 React / Vue 等框架组件、不引入新 UI / 图标库，全部组件保持 Astro Component（→ docs/development.md、docs/ui-guidelines.md）。
- 调试用的 `console.log` 交付前删除干净（ESLint `no-console` 为 error）（→ docs/ui-guidelines.md）。
- 新页面必须经过 `Layout.astro`；客户端脚本默认遵循「`astro:page-load` 初始化 + `AbortController` 清理 + 幂等防重复」，已知例外见 `docs/pitfalls.md`（→ docs/development.md）。
- 创作内容时 AI 负责生成 title / description / tags、按规范命名文章与图片文件，且新增 / 替换图片必须先压缩（`pnpm images`；pre-commit 自动执行、CI 兜底）（→ docs/content.md）。
- 搜索索引只在 build 后存在：改动正文结构或 Pagefind 标记后必须跑 `pnpm run build` 验证（→ docs/pitfalls.md）。
- 涉及样式 / 交互的改动，人工验证 light / dark 双主题与移动端表现（→ docs/ui-guidelines.md）。

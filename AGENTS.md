# Project Overview

Margin（原 Devosfera）：基于 AstroPaper 深度二次开发的个人博客（纯静态站点，作者：白雾茫茫丶，域名：https://baiwumm.com）。项目定位是「个人技术博客 + 图片画廊」，当前主要目标是在保持静态生成、页面性能与既有视觉体系（终端/赛博朋克风格、玻璃拟态、Aurora 光效）的前提下，持续扩展和维护博客内容、画廊、全局搜索、SEO 与 OG 图等既有能力，不做架构性重写。

关键事实：仓库提交历史较短（当前约 70 个提交）、无自动化测试；唯一 CI 是手动触发的发版 workflow（`.github/workflows/release.yml`：lint / build 预检 + release-it 自动完成版本号、CHANGELOG、tag 与 GitHub Release 发布，不负责部署）；改动仍依赖 `astro check` + 构建与人工验证。当前处于「先理解、后修改」的长期 AI 协作模式，任何修改前先阅读本文件、按需查阅 `docs/` 下的专题文档与相关代码。

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
5. **修改**：只改必要文件，遵循本文件与 `docs/` 相关文档的全部约定。
6. **检查**：运行 `pnpm run build`（含 `astro check`），必要时 `pnpm run lint`。
7. **总结**：说明改了什么、依赖项、验证结果与遗留事项。

# 文档索引（docs/）

本文件只保留总纲与最高频规则；专题规范按需阅读，**做对应类型的任务前必须先读对应文档**：

| 文档 | 内容 | 什么时候读 |
| --- | --- | --- |
| [docs/development.md](docs/development.md) | 技术栈、架构、目录结构、开发命令 | 改代码、动构建/依赖、排查构建问题前 |
| [docs/content.md](docs/content.md) | 内容系统、创作规范、文章 Metadata 规则 | 创建或修改文章 / 画廊、生成 title / description / tags 前 |
| [docs/ui-guidelines.md](docs/ui-guidelines.md) | 组件、样式、性能、代码规范 | 改 UI、写组件或客户端脚本前 |
| [docs/release.md](docs/release.md) | 提交规则、全自动发版流程 | 提交代码、执行发版前 |
| [docs/pitfalls.md](docs/pitfalls.md) | 已知陷阱、隐式约定与历史决策 | **任何修改前扫一遍**，避免重复踩坑 |
| [docs/galleries.md](docs/galleries.md) | 画廊功能完整技术文档 | 深入定制画廊功能时 |

# 核心红线速览

以下规则违反代价最高，始终生效（细节见对应专题文档）：

- 全站只用中文：界面文案、内容、元信息、日期一律中文；提交信息也是中文优先（→ docs/content.md、docs/release.md）。
- 不硬编码个人数据：社交链接、编辑 URL 一律走 `PUBLIC_*` 环境变量（→ docs/content.md）。
- 不新增依赖、不引入 React / Vue 等框架组件、不引入新 UI / 图标库；全部组件为 Astro Component（→ docs/development.md、docs/ui-guidelines.md）。
- 禁止 `console.log`（ESLint `no-console` 为 error），调试代码完成后删除（→ docs/ui-guidelines.md）。
- 新页面必须经过 `Layout.astro`；客户端脚本遵循「`astro:page-load` 初始化 + `AbortController` 清理 + 幂等防重复」（→ docs/development.md、docs/ui-guidelines.md）。
- 创作内容时 AI 负责生成 title / description / tags、按规范命名文章与图片文件（→ docs/content.md）。
- 搜索索引只在 build 后存在：改动正文结构或 Pagefind 标记后必须跑 `pnpm run build` 验证（→ docs/pitfalls.md）。
- 修改涉及样式 / 交互时人工验证 light / dark 双主题与移动端表现。

# 提交与发版规范

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 涉及提交信息与发布说明；提交代码或执行发版前必读。

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

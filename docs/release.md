# 提交与发版规范

> 本文是 Margin 项目 AI 协作文档之一，总纲与核心原则见根目录 [AGENTS.md](../AGENTS.md)。
> 涉及提交信息与发版流程；提交代码或执行发版前必读。

# 提交规则

- 提交信息使用 Conventional Commits 格式（与 `cz.yaml` 的 commitizen 约定一致）：`类型: 描述`，类型如 `feat` / `fix` / `docs` / `refactor` / `style` / `chore` 等。
- **提交描述以中文优先**：用简洁中文一句话说明改动，例如 `fix: 修复搜索弹窗在移动端无法关闭的问题`。
- 有明确作用域时写 `类型(scope): 描述`（如 `docs(agents): ...`），无作用域时省略。
- 一次提交只包含一个逻辑改动，不把无关改动混入同一提交。
- 提交信息会被 release-it 按 Conventional Commits 自动分组进 CHANGELOG 与 GitHub Release（分组标题见 `.release-it.json`），请认真填写，发版不再人工撰写发布说明。

# 发版流程（全自动）

- 发版操作：在 main 分支上触发 Release workflow，二选一：
  - GitHub Actions 页面 → Release → Run workflow：选 patch / minor / major，或直接填自定义版本号；
  - 命令行：`gh workflow run release.yml -f bump=minor`（自定义版本号用 `-f version=v1.7.0`）。
- CI 自动执行 lint / build 预检，任一失败即中止、不产生任何副作用；通过后由 release-it 一次性完成：更新根 `package.json` 版本号 → 更新 `CHANGELOG.md` → 创建发版提交（`chore(release): 版本号升至 vX.Y.Z`）→ 打 tag `vX.Y.Z` → 发布 GitHub Release（直接发布，非草稿）。
- 版本真源是根 `package.json`（release-it bump），tag 由它生成；README 版本徽章为动态徽章，均无需手动改。
- 发版提交推上 main 后，Cloudflare Workers Builds 自动跟随部署。
- 本地也可以 `pnpm release`（需本地 `GITHUB_TOKEN`），与 CI 共用 `.release-it.json`，行为一致。

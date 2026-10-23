---
title: "mattpocock/skills：一套让 AI 先想清楚再写代码的 Agent Skills"
description: "这篇文章介绍 mattpocock/skills 这套面向 AI 编程的工程 Skill：它是什么、包含哪些能力、能帮我们解决什么问题，以及从安装到最小工作流该怎么用。"
pubDatetime: 2026-10-23T10:00:00+08:00
tags:
  - AI 编程
  - Vibecoding
draft: false
---

把一句「帮我做个带 RBAC 的后台」丢给 Agent，三个小时后你会拿到一个能跑的项目：页面能开、接口能通、菜单能点。然后你开始加需求，发现每加一个都要重新解释一遍「为什么运营角色不该看到权限管理页」；改一个组件，它顺手重构了三个文件；第三次会话，它已经不记得你定过的任何规矩。

问题通常不在模型，而在顺序：**你没有先把它该做的事变成可验收的单元，就让它开写了。**

`mattpocock/skills` 想解决的就是这一类问题。它不是框架，也不是一套接管流程的方法论，而是一组写给编码 Agent 的工程 Skill：把「想清楚、切小、验收」拆成可以单独调用的步骤。

## 它是什么：不是框架，是一组可组合的工程 Skill

[`mattpocock/skills`](https://github.com/mattpocock/skills) 是 Matt Pocock 放在自己 `.agents` 目录里、每天在用的一组 Agent Skill。截至 2026 年 10 月，当前 v1.3.1，MIT，GitHub 约 30 万 star。

仓库的自我定位是「small, easy to adapt, composable」：整套有 27 个 skill（Engineering 20 个、Productivity 7 个），可以全装，也可以只拿其中几个。按仓库自己的说法，GSD、BMAD、Spec-Kit 这类方案更像把流程接管过去；这套 skill 把流程拆成小块，你可以只用 `grill-me`，也可以只用 `to-tickets`。控制权还在你手里，代价是你要自己判断什么时候用哪个。

Skill 本身是一个带 `SKILL.md` 的目录：Agent 根据 `description` 判断是否加载，先读 `SKILL.md`，需要细节再读 `references/`。它不是被动文档，而是会被执行的指令。

一个常被问的问题是：为什么不把这些规则写成一段大 prompt？因为 27 个 skill 是按任务加载的，只有匹配的 `description` 才会进入上下文；常驻上下文的主要是 `description` 和触发条件。这样既省 token，也让每条规则有明确的适用边界。

调用方式分两类：

- **user-invoked**：你主动敲 `/grill-me` 这类命令才会触发，负责编排流程；
- **model-invoked**：你可以在需要时调用，Agent 也会在任务匹配时自动加载，负责可复用的纪律。

一个 user-invoked skill 可以调用 model-invoked skill，但不会调用另一个 user-invoked skill。记住这条，27 个名字才不会乱。

这是 Matt 的个人工具箱，不是官方标准。它值得参考，但不该被当成不可质疑的答案；和项目既有约定冲突时，项目优先。

这篇讲的是横向的工具箱；如果你想要一条从 0 到 1 的纵向流程，可以看上一篇：

::link-card[/posts/q8x4m2kv/]

## 它有什么功能：按处境分组，而不是背 27 个名字

27 个逐个念一遍，就是一篇清单文，信息增量为零。按「你现在的处境」分组，反而更容易判断什么时候该用哪个：

| 处境               | 用哪个                                                                                                | 产出                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 想法模糊、边界不清 | `grill-me` / `grill-with-docs` / `grilling` / `domain-modeling` / `to-questionnaire` / `wait-what`    | 决策清单、术语表、ADR、问卷、重讲           |
| 要把讨论落成计划   | `to-spec` / `to-tickets` / `wayfinder` / `prototype` / `research`                                     | spec、纵切片、路线图、原型、调研            |
| 要动手写与交付     | `implement` / `implement-spec` / `tdd` / `diagnosing-bugs` / `code-review` / `pr` / `codebase-design` | 代码、测试、review、PR                      |
| 协作、维护与复盘   | `improve-codebase-architecture` / `retro` / `handoff` / `teach` / `triage`                            | 架构候选、环境改进、交接、教学、issue 流转  |
| 配置、路由与写作   | `setup-matt-pocock-skills` / `ask-matt` / `writing-for-agents` / `wizard`                             | 初始化、选 skill、写 agent 文档、交互式向导 |

如果只记四个能力，记这条主线：

**`grill-me` / `grilling`：把方案问成决策树。** 一轮只问前置条件已经确定的问题，每个问题附上推荐答案；查资料是 Agent 的事，拍板是你的事。直到没有遗留的默认假设，才算聊完。

**`to-spec`：把已经聊清楚的内容合成 spec。** 它不再 interview，只做综合。七节模板里最有用的是 `Implementation Decisions` 和 `Out of Scope`：前者防止 ticket 退化成横切清单，后者防止 spec 变成愿望清单。

**`to-tickets`：把 spec 切成纵切片。** 每张 ticket 穿过所有层、完成后能独立演示，并声明 blocking edges——也就是「这张 ticket 依赖哪几张先完成」。反例是「建表 → 写 DAO → 写 API → 写页面 → 补测试」这种横切法：每一步都不能独立验收，问题会一起爆在最后。

一张 ticket 大概长这样：

```md
# 08: 角色绑定变更与超管保护

**What to build:** 超管全量替换某个用户的角色绑定；服务端校验
「最后活跃超管」不变量。

**Blocked by:** 07

- [ ] PUT /api/users/:id/roles 要求 GRANT。
- [ ] 非超管不能授予或移除 super_admin。
- [ ] 移除后必须仍有至少一个活跃超管，否则 403。
```

**`implement` + `tdd`：按 ticket 实现。** 在预先约定的测试缝上走红-绿-重构，结束前跑 `code-review`。如果想让多个 implementer 并行跑整份 spec，用 `implement-spec`。

不知道用哪个，就跑 `ask-matt`。它只做一件事：根据你的处境，路由到对应的 skill。

版本上有一组改名要记住：v1.3.1 把 `to-prd` 改成 `to-spec`、`to-issues` 改成 `to-tickets`、`CONTEXT.md` 改成 `GLOSSARY.md`。上一篇写于改名前后，文中的 `to-prd` 对应现在的 `to-spec`；按旧目录找文件会对不上。

## 它能帮我们干什么：四类失败模式，三个改变方案的瞬间

README 把 Agent 的常见失败归成四类，这套 skill 基本是按这四类长出来的：

1. **没对齐**：Agent 没做你想要的事。`grill-me` / `grill-with-docs` 把方案拆成决策树，一轮只问前置条件已定的问题，每个问题附推荐答案，直到没有默认假设。
2. **太啰嗦**：Agent 用 20 个词说 1 个词能说清的事。`grill-with-docs` / `domain-modeling` 逼出一份共享术语表 `GLOSSARY.md`，变量、函数、文件名跟着统一。
3. **代码不工作**：没有反馈回路。`tdd` 逼红-绿-重构，`diagnosing-bugs` 把调试变成有阶段的循环。
4. **泥球**：Agent 加速写代码，也加速熵增。`to-spec` 在写 spec 前先跟你确认要动的模块和测试缝，`improve-codebase-architecture` 定期扫加深模块的机会。

这些是能力，不是证据。为了看它到底改变什么，我拿一份 947 行的后台需求做了一次只出文档的实验：范围只取认证 + RBAC，技术口径换成 Next.js 全栈 + SQLite，不写可运行代码。最后得到 1 份 spec、10 张 ticket、14 条 blocking edges、63 条验收。

这个实验只验证前半程——需求能不能被切成可验收的单元；实现质量不在结论里。`implement`、`code-review`、`pr` 三个 skill 这轮没有执行：没有代码和 diff，它们无从下手。即便如此，有三个瞬间已经值回票价。

**一、只读列表验收不了「最后超管」。** 原计划做一个只读用户列表，能验证登录、身份、菜单过滤、API 拦截、403 页，一条主线全打通。但验收清单里有一条 `SUPER_ADMIN_LAST_PROTECTED`：系统必须始终保留至少一个活跃超管。这是写路径不变量，没有角色绑定变更接口，就永远无法验收。于是加三个最小写口：创建用户、全量替换角色绑定、启用/停用。这不是范围膨胀，是验收目标倒逼出的最小写面。

**二、SQLite 的 `INTEGER` 会吞掉 `2^63 - 1`。** 权限位用位掩码，直觉是照抄 PostgreSQL 的 `bigint`。但 SQLite 的 64 位整数经过 JS 驱动会变成 `Number`，`9223372036854775807` 会失真，位运算全错。最后改成 `TEXT` 存十进制字符串，读写走 `BigInt`；代价是不能在 SQL 里做 `OR` 聚合，改成 JS `reduce`。`ALL_BITS` 用 63 位全 1，将来加第 11 个权限点不用改 seed。

**三、`super_admin` 是两个人。** 「能不能做」看聚合权限位是否等于 `ALL_BITS`；「对谁不能做」看是否直接绑定 `roles.code = 'super_admin'`。合并会出两种错：只看角色 code，全量位的普通角色不受保护；只看全量位，普通角色可以给自己加超管绑定。所以 spec 里是两个函数，且明确不能互相替代。由这个拆分还推出一条规则：创建用户永远不制造超管，超管绑定只有一个入口。

这三个问题如果留到实现阶段，会在 ticket 08 前后集中爆发：schema 定了、列表页写完了，再回头加写口，前面的「只读」假设全要推翻。grilling 的价值不是多问 39 个问题，而是把这三个返工点提前到现在。

## 该怎么使用：从安装到最小闭环

安装按你用的 Agent 选一种：

| Agent                 | 命令                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Claude Code           | `claude plugin install mattpocock-skills@claude-plugins-official`                                      |
| Codex                 | `codex plugin marketplace add mattpocock/skills`，再跑 `codex plugin add mattpocock-skills@mattpocock` |
| 其他 Agent / 想改文件 | `npx skills@latest add mattpocock/skills -a <agent>`                                                   |

不要插件和 `npx` 同时装——两套都装，每个 skill 会出现两次。Claude Code 和 Codex 的插件默认自动更新；`npx` 方式会把可编辑文件复制进项目，升级要手动跑 `npx skills@latest update`。团队用 `npx` 方式时，可以把 `.agents/skills/` 随仓库提交，每个人和 Agent 用同一份规则。

装完在仓库里跑一次 `/setup-matt-pocock-skills`。它会问你三件事：用哪个 issue tracker（GitHub、GitLab、本地文件，或你描述的其他方式）、triage 用什么 label、文档放哪里。不跑这一步，`to-spec` / `to-tickets` 不知道往哪写。

然后是最小闭环五步：

1. `/grill-me`：把想法问成决策清单。不要跳过这步直接 `to-spec`。
2. `/to-spec`：合成 spec。`Out of Scope` 必须写，否则角色 CRUD、审计日志都会被顺手写进去。
3. `/to-tickets`：切 5–10 张垂直 ticket，标 blocking edges。先确认粒度，再发布。
4. `/implement`：按 ticket 走 TDD；`/implement-spec` 可以把整份 spec 当任务图并行实现。
5. `/code-review`：Standards + Spec 两轴 review；里程碑结束跑 `/retro`，把结论写回环境。

grilling 的输出大概长这样（来自那次 947 行需求）：

```text
Q1 范围：只读用户列表能验收「最后超管保护」吗？
➡️ 不能。要么删掉这条验收，要么加三个最小写口。

Q2 存储：权限位用 bigint 还是 TEXT？
➡️ TEXT + BigInt，避开 JS Number 精度。

Q3 身份：super_admin 是一个判据还是两个？
➡️ 两个：位判据 + 绑定判据。
```

三个问题都不长，但每一个都改变了后面的方案。

装好不等于生效。把触发条件写进 `AGENTS.md`，比指望 Agent 每次自己想起来可靠：

```md file=AGENTS.md
## Agent Skills

- 新功能或范围变更前，先跑 grill-me；不要直接 to-spec。
- spec 必须有 Out of Scope；tickets 必须是垂直切片，标 blocking edges。
- 实现按 ticket 走 tdd；框架 API 以 node_modules 内随版本安装的文档为准，不凭训练记忆。
- 交付前跑 code-review；里程碑后跑 retro，结论写回 AGENTS.md 或门禁。
```

最后一条很重要：skill 是默认值，不是法律。和项目既有约定冲突时，项目优先，并在提交说明里记录取舍。

**更适合谁：**

- 已经有一份真实需求或一个真实仓库，需要把它切成 Agent 能执行的单元；
- 团队愿意维护 spec / ticket / 验收矩阵，而不是让 Agent 直接开写；
- 需要把「为什么这样做」留在仓库里，给下一轮 Agent 读。

**什么时候别用：**

- 只有一句话需求，还没有边界：先 grilling，不要直接 `to-spec`。
- 纯文档 / 纯研究：`implement`、`code-review`、`pr` 用不上，流程会断在 tickets。
- 没有 tracker、也不打算维护文档：ticket 会变成一次性消耗品。
- 小修小补：不需要全套，直接改、直接 `code-review` 就行。

## 最后：最小采用四步

不想全套上，先做四件事：

1. 先 grilling，至少问出「范围 / 验收」的冲突——那次实验最有价值的三个发现全在这一步。
2. 写一页 spec，必须有 `Out of Scope`。
3. 切 5–10 张垂直 ticket，标 blocking edges。
4. 先写验收矩阵，再写代码。

需求文档不是计划。计划是决策 + 切片 + 验收。

这套 skill 的价值不在生成更多文档，而在逼你在写代码之前把这三件事说清楚。最贵的步骤是 grilling，最容易被跳过、也最不该跳过的也是 grilling。

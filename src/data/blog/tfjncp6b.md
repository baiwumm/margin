---
title: "读 vuejs-ai/skills：一套写给 AI 的 Vue 规范"
description: "这篇文章介绍 vuejs-ai/skills 这套写给 AI 的 Vue 规范：它和 React 版有何不同、能解决哪些生成问题、实测效果如何，以及怎么安装、怎么让 Agent 稳定遵循。"
pubDatetime: 2026-10-21T16:30:00+08:00
tags:
  - Vue.js
  - AI 编程
draft: false
---

如果你让 Agent 写 Vue，大概率见过这样的代码：三百行的文件按行数拆成五个组件；composable 返回十几个内部 ref；模板里调用 `filterMembers()`；遇到 props 多层传递，第一反应是 provide/inject。单看每一处都不算错，合起来就是一个很难维护的页面。

`vuejs-ai/skills` 想解决的就是这类“AI 的默认动作”：它不是 Vue 教程，也不是组件库，而是一套写给编码 Agent 的指令包。

## 它是什么：不是库，是给 Agent 的指令包

在 OpenCode、Claude Code 这类 Agent 里，Skill 是一个带 `SKILL.md` 的目录：Agent 根据 `description` 判断是否加载，先读 `SKILL.md`，需要细节再读 `references/`。它不是被动文档，而是会被执行的指令。

`vuejs-ai/skills` 把这套机制用在 Vue 上。仓库有 8 个 skill，`vue-best-practices` 是总入口：`SKILL.md` 只有 135 行，开篇让 Agent 读 4 篇核心 reference（reactivity、SFC、component data flow、composables），其余按需加载。这种“路由表 + 按需加载”很省上下文。

它约束的不是 Vue 语法，而是几个关键分叉：组件按什么边界拆、composable 返回什么、props / emits 怎么设计、什么时候用 provide/inject、派生状态怎么算、原始类型用 `ref` 还是 `shallowRef`。

先说明定位：它不是 Vue 官方项目，组织简介写着 `(Unofficial) Building AI tools for Vue`；维护者 Vincent Ngai（SerKo）是 Vue 核心团队成员，但这是社区实验。当前 v19.0.1，MIT。把它当一套有取舍的默认规则，比当标准答案合适。

## 它解决什么问题：AI 写 Vue 的四个默认动作

AI 写 Vue 的问题，往往不是不会 API，而是在分叉上选了最省事的默认动作。

**第一，按行数拆组件。** 文件一长就拆，拆完 props / emits 更多，中间层只做转发。判断标准是让消费者或维护者理解的东西变少；文件长度、UI 区块数、API 大小只是 review signal，不是阈值。

**第二，把 composable 当状态桶。** 内部 ref 全返回，消费者可以直接改 `members`；`departments`、`departmentLabels` 这类只该留在内部的数据也一起暴露。它要求返回 consumer-facing 的 state / actions，内部 ref 和 helper 保持 private。

**第三，条件反射上 provide/inject。** 看到 props 多层传递就 inject。它要求先看中间层是不是纯转发，先试合并组件、上移 / 下移状态、用 slot 把内容还回去，再考虑 typed / scoped provide/inject。

**第四，派生状态和模板方法。** 用 `watch` 维护 `filteredMembers`，模板里写 `:filtered-members="filterMembers()"`，每次渲染都重新过滤、排序。它明确推荐 `computed`，并把派生状态放回 composable。

这些都不是语法错误，而是架构默认值。Skill 的价值，是把老手的“看情况”写成 Agent 能执行的判断顺序。

它也有边界：业务建模、项目约定、行为正确性、测试覆盖都管不了。它让代码更像懂 Vue 的人写的，但不保证代码一定对。

## 核心规则：v19 把哪些经验写成了判断标准

**组件边界按职责切，不按行数切。** 原文说：

> Extract substantial, separable UI responsibilities and stateful workflows when doing so reduces the code a consumer or maintainer must understand.

> Treat file length, UI section count, and API size as review signals, not extraction thresholds.

意思是：拆完要让人理解得更少，不是文件超过 200 行就拆。它针对的是看文件大就机械拆、拆完多出几层纯转发的行为。

**composable 返回消费者需要的东西。** 原文说：

> Return consumer-facing state and actions. If a consumer needs unrelated groups of internals, review that consumer's responsibilities too.

它没说返回的 key 越少越好，只说每个返回值都要有消费者。返回 20 个但都有人用，没问题；返回 5 个里有 3 个是内部泄漏，才是问题。数量不是判据，契约才是。

**provide/inject 只解决“纯转发”的中间层。** 原文说：

> Use typed, scoped provide/inject for shared descendant dependencies when intermediate components only relay them; reassess component boundaries first.

顺序是先看中间组件是不是只在转发；如果是，优先合并组件、上移 / 下移状态、用 slot，都不合适再上 provide/inject。它不是“props drilling 就 inject”的万能公式。

另外两条容易误读。

`shallowRef` 是一条。`reactivity.md` 要求原始类型也用，维护者在 [issue #52](https://github.com/vuejs-ai/skills/issues/52) 解释：对原始类型来说，这只是 micro-optimization，规则主要是给 AI 一个更偏性能的默认值，甚至愿意牺牲一点 idiomatic。别把它当人类项目的最佳实践。

`defineModel` 是另一条。`component-data-flow.md` 明确推荐 Vue 3.4+ 用它，所以用它不违规。后面 with-skill 选择 readonly props + patch emit，是模型更严格的选择，不是规则要求。

一句话：写给 AI 的规范，不必每条都适合人类代码；模型更严格的选择，也不都是规范要求。

## 和 vercel-react-best-practices 比：Vue 终于有了同类规范

如果你在 Agent 里写过 React，大概率见过 `vercel-react-best-practices`：Vercel Engineering 维护的 React / Next.js 性能规范，直接告诉 Agent 哪些写法会让包变大、哪些数据获取方式会拖慢页面。

Vue 这边一直缺一份同等知名度、能直接装给 Agent 的规范。Vue 教程不少，能在写代码时约束 Agent 的规则包不多。`vue-best-practices` 填的就是这个位置：同样是 Skill，同样按需加载，也把“组件怎么拆、状态放哪、composable 返回什么”写成了可执行的规则。

但两者不是一一对应：

| 维度 | vercel-react-best-practices | vue-best-practices |
| --- | --- | --- |
| 维护方 | Vercel Engineering | Vue 社区，核心团队成员维护，非官方 |
| 技术栈 | React / Next.js | Vue 3 / Vite / Router / Pinia |
| 重点 | 性能：数据获取、包体积、渲染 | 架构与写法：组件边界、数据流、composable、响应式、性能 |
| 形态 | 规则库，按影响级别组织 | `SKILL.md` 路由 + reference 按需加载 |
| 证据 | Vercel 的工程实践沉淀 | 仓库评测很薄，本文做了一次 A/B 演示 |

所以，在 Agent skill 这个生态里，React / Next.js 早就有 Vercel 的规范，Vue 这边终于有了一份能对标 Vercel 的社区版本。它不是 Vercel skill 的 Vue 翻译版：一个偏性能，一个偏架构与写法；填的是生态位，不是官方认证。真要选，还是看技术栈和团队约定。

## 实测：同一道题，baseline 与 with-skill

为了看它改变什么，我做了一个小对照实验。项目是 Vite 8 + Vue 3.5 + TypeScript 6 的成员管理页：6 个成员，支持搜索、部门筛选、只看在职、新增 / 编辑 / 删除。

我故意留了三处“AI 味”：

1. **状态挂在 App，props / emits 层层转发。** `App.vue` 持有 `useMembers()`，9 个 props、9 个事件先交给 `MemberPage`，再一层层往下传。
2. **composable 把内部状态全导出。** `useMembers` 返回 18 个东西，包括可写的 `members`，以及本可留在内部的 `departments`、`departmentLabels`；筛选结果用 `watch(..., { immediate: true, deep: true })` 维护，组件里又写了一个 `filterMembers()` 做同样的事。
3. **模板里直接调方法。** `MemberPage` 用 `:filtered-members="filterMembers()"`，每次渲染都重新过滤、排序；同一个逻辑在 composable 和组件里各有一份。

两组用同一句 prompt：

> 重构这个 Vue 3 项目里的成员管理页面：按职责拆分组件，理顺 props / emits 和 composable 的返回值，不要改变现有行为。完成后运行 pnpm build 验证。

with-skill 只在前面加仓库推荐的前缀：

> use vue skill, 重构这个 Vue 3 项目里的成员管理页面……

模型是 `opencode/deepseek-v4.1-flash-free`，baseline 和 with-skill 各跑一次。baseline 把 `.agents/` 移出项目，with-skill 再放回；两边从同一个 commit 出发。这是演示，不是评测：下面的差异只说明这一次发生了什么，不代表平均提升。

### baseline：它本来就会做对大部分事

baseline 比预想的好：拆成 5 个组件，用 `computed` 替掉 `watch`，删掉重复的 `filterMembers()`，`MemberPanel` props 从 7 个降到 3 个，`defineModel` 用了 4 处。`pnpm build` 通过，初始渲染 6 行成员。

它没用 provide/inject，而是把 `MemberPage` props 收敛到 6 个，用 `defineModel` 处理 filters / draft 两个双向契约。`App.vue` 仍 54 行，`useMembers` 返回 16 项，`members` 仍可写。

```ts
// baseline：状态和动作混在一起，状态可写
return {
  members, loading, error, filters, filteredMembers,
  selectedMember, isFormOpen, draft, lastUpdated,
  refresh, openCreateForm, openEditForm, closeForm,
  saveMember, removeMember, resetFilters,
};
```

这已经是能合并的重构，不是典型的 AI 烂代码。

### with-skill：差别在“谁拥有”

with-skill 也拆成 5 个组件，但从 `App.vue` 开始就不同了：

```vue file=src/App.vue
<script setup lang="ts">
import MemberPage from "./components/MemberPage.vue";
</script>

<template>
  <main class="app">
    <MemberPage />
  </main>
</template>
```

54 行变 9 行。`useMembers()` 移进 `MemberPage`，App 只留布局壳；header、筛选、表格、表单由真正使用状态的组件自己组织。

`useMembers` 的返回值也换了形态：

```ts
// with-skill：状态 readonly，动作单独暴露
return {
  totalCount, activeCount,
  filteredMembers: readonly(filteredMembers),
  loading: readonly(loading),
  error: readonly(error),
  filters: readonly(filters),
  selectedMember: readonly(selectedMember),
  isFormOpen: readonly(isFormOpen),
  draft: readonly(draft),
  lastUpdated: readonly(lastUpdated),
  refresh, openCreateForm, openEditForm, closeForm,
  updateDraft, updateFilters, saveMember, removeMember, resetFilters,
};
```

with-skill 返回 19 项，比 baseline 的 16 项还多。多出来的是 `totalCount`、`activeCount`、`updateDraft`、`updateFilters` 这些消费者真正需要的；内部数组 `members` 改名 `allMembers`，不再导出。重点不是少导出，而是该导的导、不该导的藏。

子组件的契约也跟着变了。baseline 的 `MemberForm` 用 `defineModel` 直接改 draft；with-skill 改成 readonly props + patch emit：

```ts
const props = defineProps<{
  draft: Readonly<MemberDraft>;
  selectedMember: Readonly<Member> | null;
}>();

const emit = defineEmits<{
  "update:draft": [draft: MemberDraft];
  save: [];
  cancel: [];
}>();

function patchDraft(patch: Partial<MemberDraft>) {
  emit("update:draft", { ...props.draft, ...patch });
}
```

这比 `defineModel` 更长，换来单向数据流：子组件不能悄悄改父级状态，代价是模板里多写事件转发。这是取舍，不是免费的胜利。

### 结果：增量在“所有权”和“契约”

关键指标：

| 检查项 | baseline | with-skill |
| --- | --- | --- |
| 组件数量 | 5 | 5 |
| `App.vue` | 54 行 | 9 行 |
| 状态归属 | App 持有 `useMembers` | `MemberPage` 持有 |
| composable 返回 | 16 项，含可写 `members` | 19 项：8 个 readonly、2 个派生计数、9 个动作 |
| `defineModel` | 4 处 | 0 处 |
| `readonly(...)` 返回值 | 0 处 | 8 处 |
| provide / inject | 未使用 | 未使用 |
| `computed` | 2 处 | 3 处 |
| 构建 / 初始渲染 | 通过 / 6 行 | 通过 / 6 行 |

**增量在“所有权”和“契约”，不在“会不会写 Vue”。**

- 状态从 App 下沉到页面，App 只管布局，不再知道成员数据长什么样。这是这次 diff 最有价值的一处。
- 状态变成 readonly，修改必须走显式 action。子组件不能再通过 `defineModel` 直接写父级状态，数据流更可控。
- 派生状态回到 composable：`totalCount`、`activeCount` 和 `filteredMembers` 放在一起，页面不用自己算。
- 组件数量、computed、去重这些基本功，baseline 已经会了。skill 没把烂代码变好，只是把能跑的重构推向边界更清楚的重构。

它没有做的，也不要指望它做：

- 它没有阻止拆分：两边都拆成 5 个组件，因为 prompt 本身要求按职责拆。没提拆分时它会不会主动拆，这次测不出来。
- 它没有强制 provide/inject：两边都没用。with-skill 把状态移到页面，baseline 用 `defineModel` 收敛契约；skill 原文也支持先重评边界。
- 它没有让代码变短。with-skill diff 更大（275 增 / 312 删，baseline 189 / 208），readonly、显式 action、类型都要占行；最终 `src` 只少 18 行。用代码量衡量 skill 容易得出错误结论。

仓库自己也有评测，但很薄：截至 2026 年 10 月 21 日，只有 3 份 `results.json`，全部来自 `computed-vs-methods`。其中 sonnet 只跑了 with-skill，baseline 没有对照；haiku 的三个场景各有一份结果。这组数据能说明方向，但还不足以支撑“平均提升”。

| 场景 | 模型 | baseline | with-skill |
| --- | --- | --- | --- |
| 1 | haiku | 失败 | 通过 |
| 2 | haiku | 通过 | 通过 |
| 3 | haiku | 通过 | 通过 |
| 1–3 | sonnet | 未跑 | 通过 |

README 自己的标准是 Fail / Pass 保留、Pass / Pass 考虑移除；这里 3 个场景有 2 个 Pass / Pass，只有场景 1 是 Fail / Pass。所以不是规则没用，而是评测和规则维护还没闭环。判据又是文件内容正则，不是跑交互：能看写法，看不到行为有没有坏。

结论不是“skill 没用”或“很有用”，而是：**对强模型，增量在架构判断，不在语法常识；对弱模型，增量才可能落在 computed、拆组件这些基本功上。** 仓库唯一的 baseline 失败样本来自 haiku，方向对得上，但样本只有 1 个，不能当定律。

## 安装：只装最需要的那一个

在项目里试一下，最省事的是：

```bash
npx skills add vuejs-ai/skills --skill vue-best-practices -y
```

它会把 skill 装到项目级的 `.agents/skills/`；安装时不指定具体 Agent，装完用 `npx skills list` 确认。仓库建议在 prompt 前面加 `use vue skill,` 来提高触发率。卸载：

```bash
npx skills remove vue-best-practices -y
```

或者直接删掉 `.agents/skills/vue-best-practices`。项目级安装的好处是它跟着仓库走，团队里每个人的 Agent 用同一份规则；坏处是它会进入代码审查范围，所以装之前先读一遍。

不要一上来把 8 个 skill 全装。比较合理的顺序是：

1. 先装 `vue-best-practices`，它是总入口，覆盖组件边界、数据流、composable、性能这些日常问题。
2. 项目确实用了 Router / Pinia / 测试，再装对应的 skill。
3. 调试阶段再考虑 `vue-debug-guides`；它的 reference 很多，装之前想清楚上下文预算。
4. `vue-jsx-best-practices` 只在你写 JSX 时才有必要。
5. `create-adaptable-composable` 更适合当“怎么写 composable”的短文看，不用急着装。

如果你想让团队共享，可以把 `.agents/skills/` 随仓库提交；如果 CLI 默认用符号链接，跨平台团队可以加 `--copy`，用真实文件代替链接。升级时记录版本（当前 v19.0.1），不要静默更新。

另外，CLI 会打印 **Review skills before use; they run with full agent permissions.** Skill 不是被动文档，它是一组会被 Agent 执行的指令；装它等于给 Agent 加了一段行为约束，值得先读一遍。

## 在项目里让 Agent 遵循：五条落地规则

装好不等于生效。Skill 靠 `description` 和任务匹配触发；在项目里，最好把它变成明确的规则。

### 1. 在 AGENTS.md 写触发条件

只靠模型自己判断“该不该读 skill”，不稳定。把触发条件写进项目的 `AGENTS.md`，让每次 Vue 任务都先读：

```md
## Vue

- 修改 Vue 组件、composable、路由或状态管理前，先读 `.agents/skills/vue-best-practices/SKILL.md`，按任务加载对应 reference。
- 组件拆分看职责和消费者理解成本，不按行数；composable 只返回消费者需要的状态和动作；provide/inject 只在中间层纯转发且边界无法调整时使用。
- 与项目现有约定冲突时，以项目代码为准，并在提交说明里记录取舍。
- 完成后运行项目的 build / lint 命令；涉及交互的改动再补 light/dark 与移动端检查。
```

这样就把“可选加载”变成 Vue 任务的前置步骤。冲突那一条很重要：skill 是默认值，不是法律；项目已有模式优先。

### 2. 用“先计划、后实现、再自检”的 prompt

不要只说“帮我重构这个页面”。给 Agent 一个固定的工作顺序：

```text
use vue skill, 先不要写代码。阅读 .agents/skills/vue-best-practices/SKILL.md，
按组件边界（含 props/emits）、composable 契约、provide/inject、派生状态四项审查当前页面，
列出改动计划和风险；我确认后再实现。
实现后运行项目的 build / lint 命令，并按同一份清单自检。
```

“先不要写代码”很关键。Agent 默认会直接改文件；先让它读规则、列计划，你才有机会纠正方向。四项审查覆盖 skill 的核心分叉，别让它跑偏到无关样式。

### 3. 让 Agent 按四个问题自检

build 只能证明能编译。A/B 里两边 build 都通过，但状态归属和契约完全不同。所以实现完成后，再让 Agent 回答四个问题：

1. **组件边界**：拆出来的组件有没有减少消费者理解成本？还是只是转发 props / emits？
2. **composable 契约**：返回值是否都有消费者？有没有可写内部状态泄漏？
3. **数据流**：provide/inject 之前，是否试过合并、上移 / 下移状态、slot？
4. **派生状态**：有没有 `watch` + `ref` 同步、模板调方法？能不能用 `computed`？

把自检结果写进 PR 或提交说明，不要只写“已按规范修改”。如果某一项不满足，让 Agent 说明为什么，而不是强行改。

### 4. 冲突时项目优先

这套 skill 有几个明确取舍，不能照搬：

- 它推荐 `defineModel`。团队已经在用，就别为了“更严格”改成 readonly props + patch emit；with-skill 那么做是模型的额外判断，不是规则要求。
- 它对原始类型也建议 `shallowRef`。维护者自己说了，这只是 micro-optimization；人类项目里优先可读性，不要为了性能微优化牺牲一致性。
- 它把“拆组件”当成默认方向，但前提是能减少理解成本。如果你的页面就是一个小而内聚的功能，保留一个 SFC 反而更清楚；文件长度不是拆分理由。

把这些冲突写进 `AGENTS.md`，明确“项目约定 > skill 默认值”，比让 Agent 每次自由发挥更可靠。

### 5. 团队协作：项目级 + 版本记录

项目级 `.agents/skills/` 随仓库走，团队里每个人的 Agent 用同一份规则。把当前版本（v19.0.1）和安装命令写进 README 或 AGENTS.md；升级前用一个真实任务跑一次 plan / implement / self-check，不要只看版本号。

如果团队跨平台，注意 CLI 默认可能用符号链接；需要提交到仓库时用 `--copy`，或者直接把 skill 目录作为普通文件提交，避免 Windows / macOS 的链接差异。

## 最后：5 条选包检查清单

这套仓库最值得用的地方，是把“看情况”变成可检查的问题清单，而不是替你决定架构。它不是官方规范，也没经过大规模验证；它是一个核心团队成员的社区实验，当前 v19.0.1。可以用，但别当不可质疑的标准答案。

如果你只想做一件事：先装 `vue-best-practices`，在 `AGENTS.md` 里写一条触发规则，然后用一个真实页面跑一次“计划 → 实现 → 自检”。比读十篇介绍更有用。

如果你还想判断别的“写给 AI 的规范包”，可以用这 5 条：

1. **来源**：谁维护、是否官方、最近一次提交是什么时候？核心团队成员是加分项，不是免检章；先看仓库怎么自我描述。
2. **触发**：`description` 有没有写清“做什么、什么时候用”？在你的 Agent 里能不能稳定触发？拿一条真实任务试一次。
3. **证据**：有没有评测？覆盖了多少条规则？baseline 和 with-skill 都跑了吗？只有 with-skill 通过的结果，不算对照。
4. **维护**：reference 跟不跟得上框架版本？升级会不会改变行为？有没有版本记录？
5. **可逆**：能不能项目级安装、干净卸载？是否要求全权限？先读再装，别把它当成不可回滚的依赖。

规范写得再漂亮，最后也要看 Agent 改出来的代码；在那之前，读它的人得先有自己的判断。

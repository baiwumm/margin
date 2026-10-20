# Changelog

## [1.7.0](https://github.com/baiwumm/margin/compare/v1.6.0...v1.7.0) (2026-10-20)

### ✨ Features | 新功能

* /disclaimer 免责声明页 + 页脚「内容声明」链接（D64 站点侧配套，与小程序端 pagesB/disclaimer 同文案两端对齐） ([583d1b4](https://github.com/baiwumm/margin/commit/583d1b4f4b0992ffe3828500163ef6743b5b9455))
* **blog:** 新增《free-for-dev 中文版：一个每天自动翻译、成本约零的穷鬼套餐索引》文章 ([273d014](https://github.com/baiwumm/margin/commit/273d014bd03a0812fa56098bac867274ce56765e))
* **blog:** 新增《从零开始 VibeCoding 一个项目：先立规范，再写代码》文章 ([44769bb](https://github.com/baiwumm/margin/commit/44769bbe598aeace554c5eafb3b131c3316c7558))
* **content:** 新文章《DeepSeek 刚更新，Qoder 就把它免费了》（Qoder 1024 预热、V4.1-Flash-1017 限时免费 0x，海报/官方公告/官网横幅/实机模型选择器 4 图、guizang 封面 ogImage） ([e8b6c74](https://github.com/baiwumm/margin/commit/e8b6c74e3d3ef69759fa0f094fcada523f45be56))
* **content:** 新文章《在 Zed 终端里跑 pi：我的极简 Agent 开发组合》（zed/vscode 冷启动与内存实测、pi 与 opencode 图鉴 7 图、guizang 封面 ogImage） ([bf877ac](https://github.com/baiwumm/margin/commit/bf877ac4806312639bc6e3253978c4e23a3e9f55))
* **export:** projects.json 加性下发 accountStars/joinedAt（D66，站点 hero 徽章口径）——逐项冗余避开信封/缓存层透传限制，拉取失败整组缺席，schemaVersion 保持 1 ([8079583](https://github.com/baiwumm/margin/commit/8079583ec028ee05336a300e92fc2dcadb9261c5))
* **export:** 搜索体积预算治理——正文索引口径 28→16 块、titles 提档 64KB、assertBudget 新增 80% 预警 ([640ae5b](https://github.com/baiwumm/margin/commit/640ae5be963d4c17eb08495ba35663efd8b40e5c))
* **og:** 全站动态 OG 换肤为黑底终端风——移植手作封面设计语言（Maple Mono CN 站内同源、2400×1260 渲染），post/site/tag 三模板统一，非文章页改用动态站点 OG，规范写入 docs/content.md ([614efe5](https://github.com/baiwumm/margin/commit/614efe50a21a5b9d6ebd19f052514d3736753bfb))
* **projects:** 新增 free-for-dev-zh 项目并补充 JavaScript 语言色映射 ([f2fe8db](https://github.com/baiwumm/margin/commit/f2fe8db8c5d8e80d8f0cffa9a4c8a56e80268d76))
* **tools:** pre-commit 钩子自动压缩暂存图片（core.hooksPath，pnpm hooks 启用） ([8ca287c](https://github.com/baiwumm/margin/commit/8ca287c1a2bef3320c3a3396adfb2605221078f9))
* **tools:** 新增图片压缩脚本 compress-images（pnpm images） ([34aff4a](https://github.com/baiwumm/margin/commit/34aff4ae46dcd1a786143657d499cb2f875ec5d7))

### 🎫 Chores | 其他更新

* **data:** 全量压缩存量图片——168 张瘦身 3.1MB，画质策略 mozjpeg q80 / webp q80 / png 无损与调色板择优，画廊大图到顶保留 ([d4567f7](https://github.com/baiwumm/margin/commit/d4567f7b571b311daaba420e2da0cfdae6c47ecf))
* **data:** 存量图片按现行压缩策略重压——55 张（文章截图 52、画廊 webp 3），画质策略与 d4567f7 一致 ([70669e1](https://github.com/baiwumm/margin/commit/70669e1a13d5c3749ed440f68fc54e172d54c4cb))

### 📝 Documentation | 文档

* **blog:** theme-switch-animation 文章对齐库 v0.5.1（15 种类型、reverse 选项），六张配图重绘为瑞士克莱因蓝风格并压缩（3080KB→1092KB） ([575c2a0](https://github.com/baiwumm/margin/commit/575c2a0d8e875c5b42222f196576b382d26a33d9))
* **blog:** 压缩 free-for-dev 中文版文章配图（1181KB→434KB，尺寸不变） ([ea89d7b](https://github.com/baiwumm/margin/commit/ea89d7b451521341c42fe26afc363e3f461e20e8))
* **license:** 版权主体统一为 baiwumm，移除模板遗留第三方署名 ([e9c4ebc](https://github.com/baiwumm/margin/commit/e9c4ebc02a1237df596a30e18577dcddaf43116d))
* **readme:** 小程序/公众号扫码双码 + 相关项目（三仓互指） ([0c6fb1b](https://github.com/baiwumm/margin/commit/0c6fb1b0c21d44ce6020d5dedb6f301acfaa5a39))
* **readme:** 版本口径一行——小程序 2.x / 站点 v1.x 两轴独立 ([f7214d0](https://github.com/baiwumm/margin/commit/f7214d048b085dbf40a9158313e11e068c7f91b1))
* 全量校对 AI 协作文档事实错误并补记 margin-app / margin-comments 关联项目 ([b8154d7](https://github.com/baiwumm/margin/commit/b8154d7cd36bfb6413dd314e2573f3338622037c))
* 新增图片压缩约定（AGENTS 红线、content 规范、development 命令） ([28e39ed](https://github.com/baiwumm/margin/commit/28e39ed5bc054c7ec49ee5e8fd9c25953e74b1c4))

### 💄 Styles | 风格

* **avatar:** 本站头像更换为新图（148KB→45KB），/friends 页「本站信息」三处引用同步改用 avatar.png ([8557f04](https://github.com/baiwumm/margin/commit/8557f040af6ab293df6442e9c7d346960e4b15cf))
* **footer:** 「内容声明」入口换盾牌图标，移至社交图标列右侧（/disclaimer 链接保留不变） ([751a46d](https://github.com/baiwumm/margin/commit/751a46deca8311d3e53ac59c7bac5c16160491d4))

### 🔧 Continuous Integration | CI 配置

* **release:** 关闭 release-it 默认 npm publish——静态站点无 npm 发布诉求，CI 无 npm 凭证导致新版 workflow 首跑失败 ([a203672](https://github.com/baiwumm/margin/commit/a203672408570917d975c131196273f2f3520f8f))
* **release:** 发版改为 workflow_dispatch + release-it 全自动流程 ([38ae039](https://github.com/baiwumm/margin/commit/38ae03920751a494f8eea5c1fd5b2cfd638f8004))
* 新增未压缩图片校验 workflow（push/PR 触发，--check 干跑兜底钩子） ([7d6529a](https://github.com/baiwumm/margin/commit/7d6529a620bb3fcaa5a3fbe8c0894a81bafcf4a3))

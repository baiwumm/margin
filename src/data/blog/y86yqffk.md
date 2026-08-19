---
title: 'Next.js 实战 (八)：使用 Lodash 打包构建产生的"坑"？'
description: "这篇文章记录了 Next.js 项目打包构建时因 lodash-es 引用 Dynamic Code Evaluation 导致 Edge Runtime 报错的问题分析和解决过程。"
pubDatetime: 2025-01-15T16:57:00+08:00
tags:
  - Next.js
draft: false
---

## 前言

最近一直在折腾 [Nextjs15](https://nextjs.org/) ，也在断断续续地写《`Next.js15 实战系列`》的文章，后来总感觉文章如果没有线上效果预览差点意思，所以就想着先把目前做的项目先部署上线，后续再慢慢添加新功能。

因为之前没有部署过 [Nextjs15](https://nextjs.org/) 工程项目，我就隐约感觉没有那么简单，果不其然，开发环境一切正常，打包构建时一堆报错。

## 问题分析

控制台报错日志：

```text
../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/_root.js
profile:build: Dynamic Code Evaluation (e. g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime
profile:build: Learn More: https://nextjs.org/docs/messages/edge-dynamic-code-evaluation
profile:build:
profile:build: Import trace for requested module:
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/_root.js
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/isBuffer.js
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/lodash.js
profile:build: ./src/utils/Fetcher.ts
profile:build: ./src/@types/schema.ts
profile:build:
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/template.js
profile:build: Dynamic Code Evaluation (e. g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime
profile:build: Used by default
profile:build: Learn More: https://nextjs.org/docs/messages/edge-dynamic-code-evaluation
profile:build:
profile:build: Import trace for requested module:
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/template.js
profile:build: ../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/lodash.js
profile:build: ./src/utils/Fetcher.ts
profile:build: ./src/@types/schema.ts
```

很明显，这是由于工程中使用了 [lodash-es](https://www.lodashjs.com/) 产生的报错。

我就纳闷了，开发环境使用 [lodash-es](https://www.lodashjs.com/) 一切正常，能有什么报错？

我跑到 [Nextjs15](https://nextjs.org/) 的 [issues](https://github.com/vercel/next.js/issues) 寻找原因，发现真的有人有同样的问题 - [#51401](https://github.com/vercel/next.js/issues/51401)，了解更多：

::link-card[https://nextjs.org/docs/messages/edge-dynamic-code-evaluation]

具体而言，不支持以下 **api**：

1.  [eval()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/eval)

2.  [new Function()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function)

3.  [WebAssembly.compile](https://developer.mozilla.org/zh-CN/docs/WebAssembly/JavaScript_interface/compile_static)

4.  [WebAssembly.instantiate](https://developer.mozilla.org/zh-CN/docs/WebAssembly/JavaScript_interface/instantiate_static)

应该是 [lodash-es](https://www.lodashjs.com/) 的源码中包含了其中的 **api** ，导致打包报错。

## 解决问题

一开始我按照官网和 [#51401](https://github.com/vercel/next.js/issues/51401) 的方案去尝试解决问题

```ts
export const config = {
  runtime: "experimental-edge",
  unstable_allowDynamic: [
    "/src/utils/Fetcher.ts",
    "/src/@types/schema.ts",
    "*/**/node_modules/lodash-es/**",
  ],
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

但是不管我如何更改，折腾了一天，打包时这个报错依然存在。

最后实在没办法，因为我使用 [lodash-es](https://www.lodashjs.com/) 的 **api** 不多，最终删除了 [lodash-es](https://www.lodashjs.com/)，拷贝 [radash](https://www.radash.wiki/) 的部分源码到本地，最后打包果然没问题。

这个可能是最笨最无奈的办法了，如果大家发现更好的解决方案，可以留言讨论，哈哈

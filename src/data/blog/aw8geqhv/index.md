---
title: "Next.js 实战 (一)：项目搭建指南"
description: "这篇文章记录了从零搭建 Next.js 后台模板项目的过程，涵盖项目初始化、目录结构说明、ESLint 和 Husky 提交规范配置以及 NextUI 组件库的接入。"
pubDatetime: 2024-07-03T09:50:00+08:00
tags:
  - Next.js
draft: false
---

## 前言

时间过得好快，一下就来到2024下半年了。

上半年我为了学习 [Nuxt3](https://nuxt.com/)，从 0 到 1 开发了一个导航网站：[Better Nav](https://nav.baiwumm.com/)，目前主要的功能都已完成了，后续有时间再慢慢添加有趣的功能。

下半年开始进攻 [Next.js](https://nextjs.org/)，前段时间我使用 [Next.js](https://nextjs.org/) 重构了一个项目：[今日热榜](https://hot.baiwumm.com/)，对 [Next.js](https://nextjs.org/) 有一定的认识，这次打算完整地从 0 到 1 搭建一个后台模板，进而探索 [Next.js](https://nextjs.org/) 的奥秘。

## 项目搭建

1.  官方建议使用 **create-next-app** 启动一个新的 **Next.js** 应用程序：

```bash
npx create-next-app@latest
```

2.  安装时，你将看到以下提示：

```text
What is your project named? my-app
Would you like to use TypeScript? No / Yes
Would you like to use ESLint? No / Yes
Would you like to use Tailwind CSS? No / Yes
Would you like to use `src/` directory? No / Yes
Would you like to use App Router? (recommended) No / Yes
Would you like to customize the default import alias (@/*)? No / Yes
What import alias would you like configured? @/*
```

> Next.js现在默认附带 TypeScript、ESLint 和 Tailwind CSS 配置。

3.  项目运行

```bash
pnpm dev
```

## 目录结构

```text
📄 next.config.js // Next.js的配置文件
📄 package.json // 项目依赖项和脚本
📄 instrumentation.ts // OpenTelemetry and Instrumentation 文件
📄 middleware.ts // Next.js请求中间件
📄 .env // Environment variables 环境变量
📄 .env.local // 局部环境变量
📄 .env.production // 生产环境变量
📄 .env.development // 开发环境变量
📄 .eslintrc.json // ESLint 的配置文件
📄 .gitignore // 要忽略的 Git 文件和文件夹
📄 next-env.d.ts // 用于 Next.js 的 TypeScript 声明文件
📄 tsconfig.json // TypeScript 的配置文件
📄 jsconfig.json // JavaScript 的配置文件
```

## APP 路由约定

```text
📄 layout[.js,.jsx,.ts] // Layout 布局
📄 page[.js,.jsx,.ts] // Page 页
📄 loading[.js,.jsx,.ts] // Loading UI 加载 UI
📄 not-found[.js,.jsx,.ts] // Not found UI 未找到 UI
📄 error[.js,.jsx,.ts] // Error UI 错误 UI
📄 global-error[.js,.jsx,.ts] // Global error UI 全局错误 UI
📄 route[.js,.ts] // API endpoint API 端点
📄 template[.js,.jsx,.ts] // Re-rendered layout 重新渲染的布局
📄 default[.js,.jsx,.ts] // 并行路由回退页面
```

更多约定请参考：

::link-card[https://nextjs.org/docs/getting-started/project-structure#app-routing-conventions]

## 配置 Eslint、Prettierrc、Husky等项目提交规范

参考文章：

::link-card[/posts/hnc96th6]

## 使用 release-it 自动管理版本号和生成 CHANGELOG

参考文章：

::link-card[/posts/c8ht5uut]

## 安装 NextUI

1.  根目录运行

```bash
pnpm add @nextui-org/react framer-motion
```

2.  新建 **.npmrc** 文件，并写入以下内容

```ts
public-hoist-pattern[]=*@nextui-org/*
```

3.  **tailwind.config.js** 配置文件添加代码：

```ts
import { nextui } from "@nextui-org/react";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [nextui()],
};
export default config;
```

4.  在根节点添加 **NextUIProvider**

```ts
import './globals.scss';

import { NextUIProvider } from '@nextui-org/react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'next-admin',
  description: '基于 Next.js 开发的后台模板',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-cn">
      <body className={inter.className}>
        <NextUIProvider>{children}</NextUIProvider>
      </body>
    </html>
  );
}
```

## 总结

后续开发会以 [Next.js](https://nextjs.org/) 为核心，开发一个类似 [React-Admin](https://react.baiwumm.com/) 项目的功能，为此来探索 [Next.js](https://nextjs.org/) 其中的奥秘：

![](./01-project-structure.png)

我会在此基础上加入我的一些设计和想法，致力于提高用户体验。

开发周期可能会有点长，但我会记录在开发中所遇到的问题和解决的办法，并记录在 [Next实战系列](https://baiwumm.com/categories/next) 中，后期会打算使用 [Prisma](https://prisma.yoga/) + [Supabase](https://supabase.com/) 数据库存储数据，最终完成一个基于 [Next.js](https://nextjs.org/) 的全栈项目。

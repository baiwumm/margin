---
title: "Nest.js 实战 (六)：使用 Session 在不同请求间存储信息"
description: "这篇文章介绍了在 Nest.js 中使用 express-session 中间件管理用户会话的方法，包括全局配置、参数说明和常用的 Session 操作。"
pubDatetime: 2024-07-31T10:11:00+08:00
tags:
  - Nest.js
draft: false
---

## 前言

**Session** 是记录客户状态的机制，为每个用户的浏览器创建的一个会话对象，今天我们来看一下怎么在 [Nest.js](https://nestjs.com/) 中使用 **Session**

## 安装依赖

```bash
pnpm add express-session
pnpm add @types/express-session -D
```

## 全局配置

安装完成后，在 **main.ts** 中将 **express-session** 配置为全局中间件：

```ts
import session from "express-session";

// 配置 session
app.use(
  session({
    secret: "baiwumm", // 签名
    resave: false, // 强制保存 sseion 即使它并没有变化，默认为true
    saveUninitialized: false, // 强制将未初始化的 session 存储
  })
);
```

## 参数说明

| 属性              | 类型    | 默认值      | 是否必填 | 描述                                                                                        |
| ----------------- | ------- | ----------- | -------- | ------------------------------------------------------------------------------------------- |
| secret            | string  | \-          | ✅       | 用于加密 session ID 的秘密字符串。强烈建议使用一个足够长且随机的字符串                      |
| resave            | boolean | true        | ⭕       | 是否在每次请求时保存 session，即使 session 没有更改。通常设置为 false 以提高性能            |
| saveUninitialized | boolean | true        | ⭕       | 是否为尚未初始化的 session 创建新的 session 对象。通常设置为 false 以避免不必要的数据库写入 |
| name              | string  | connect.sid | ⭕       | 设置 session ID 的名称                                                                      |

更多参数请参考：

::link-card[https://github.com/expressjs/session#options]

## 使用方式

1.  使用 **@Req** 修饰器：

```ts
import { Controller, Get, Res } from '@nestjs/common';
import { Request } from 'express';

@Get()
 findAll(@Req() req: Request) {
   req.session.username = 'admin';
}
```

2.  使用 **@Session** 修饰器：

```ts
import { Controller, Get, Session } from '@nestjs/common';
import { Request } from 'express';

@Get()
 findAll(@Session() session: SessionInfo) {
  session.username = 'admin';
}
```

## 常用方法

1.  设置会话数据：

```text
session.userName = 'admin'
```

2.  获取会话数据：

```text
session.userName // admin
```

3.  删除会话数据

```sql
delete session.userName;
```

4.  销毁整个会话

```text
session.destroy();
```

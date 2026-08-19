---
title: "Next.js 实战 (九)：使用 next-auth 完成第三方身份登录验证"
description: "这篇文章介绍了在 Next.js 中使用 next-auth 实现 GitHub 第三方登录的完整流程，包括 Provider 配置、会话管理和 Prisma 适配器集成。"
pubDatetime: 2025-01-17T14:12:00+08:00
tags:
  - Next.js
  - next-auth
draft: false
---

## 什么是 next-auth

[next-auth](https://github.com/nextauthjs/next-auth) 是一个专门为 [Next.js](https://nextjs.org/) 设计的、易于使用的、灵活的身份验证库。它简化了为你的应用程序添加身份验证（如登录、注册、登出等）的过程。[next-auth](https://github.com/nextauthjs/next-auth) 支持多种认证方式，包括通过电子邮件和密码、OAuth 2.0 提供商（如 Google、GitHub、Facebook 等）、以及自定义提供商。

以下是它的一些主要特点：

1.  **内置 OAuth 提供商**：[next-auth](https://github.com/nextauthjs/next-auth) 内置支持多个 OAuth 和 OpenID Connect 提供商，使得与第三方服务集成变得简单。

2.  **会话管理**：提供了简单的 API 来处理用户会话，允许开发者轻松地获取当前用户的会话信息。

3.  **数据库兼容性**：可以与多种数据库一起使用，以存储用户数据。它支持无头 CMS 和自定义后端。

4.  **多语言支持**：内置对多语言的支持，可以根据用户的偏好语言显示错误消息和其他文本。

5.  **自定义页面**：允许创建自定义的登录、注册或错误页面，以便更好地融入应用程序的设计风格。

6.  **安全默认值**：采用了安全的默认设置，帮助保护应用免受常见的安全问题影响。

7.  **API 路由**：利用 [Next.js](https://nextjs.org/) 的 API 路由功能来处理身份验证逻辑，这意味着你可以创建自己的端点来进行登录、登出等操作。

8.  **JWT 或数据库会话**：可以选择使用 JSON Web Tokens (JWT) 进行状态无会话管理，或者选择基于数据库的会话。

9.  **适配器支持**：对于想要将用户数据持久化到数据库中的情况，[next-auth](https://github.com/nextauthjs/next-auth) 提供了适配器（adapters），可以方便地与不同的数据库系统进行集成，比如 [Prisma](https://prisma.yoga/)、[TypeORM](https://typeorm.io/) 等。

## 具体步骤

1.  安装依赖

```bash
pnpm add next-auth@beta
```

2.  设置环境

唯一强制的环境变量是 **AUTH\_SECRET**，这是库用来加密令牌和电子邮件验证散列的随机值。运行以下命令随机生成一个：

```bash
npx auth secret
```

这也会将其添加到本地的 **.env** 文件中

3.  配置

在应用的根目录下创建一个新的 **auth.ts** 文件，包含以下内容:

```ts
import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [],
});
```

4.  在 **/app/api/auth/\[...nextauth\]/route.ts** 下添加路由处理程序：

```ts
import { handlers } from "@/auth"; // Referring to the auth.ts we just created
export const { GET, POST } = handlers;
```

## 配置 Github Provider

1.  打开 [OAuth Apps](https://github.com/settings/developers) 页面，点击 **New Oauth App**

![](./01-auth-providers.png)

2.  填入项目的信息，这里的 **Homepage URL** 我们可以先填本地开发的地址，等部署上线再改成线上地址，**Authorization callback URL** 填入 https://example.com/api/auth/callback/github，然后点击 **Register Application**

![](./04-github-login.png)

3.  打开刚创建的 **Oauth App**，这里可以根据需要设置 **Oauth App** 信息，点击 **Generate a new client secret** 复制密钥

![](./05-user-table.png)

4.  在根目录的 **.env** 文件中填入刚才复制的密钥

```bash
GITHUB_ID= 'xxxxx'
GITHUB_SECRET= 'xxxxxxxxx'
```

5.  打开 **/src/auth.ts** 文件，配置 **Github Provider** 信息

```ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
});
```

## 会话管理

1.  服务器组件 - 登录

```ts
import { signIn } from "@/auth.ts"

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("github", { redirectTo: "/dashboard" })
      }}
    >
      <button type="submit">Sign in</button>
    </form>
  )
}
```

2.  服务器组件 - 退出

```ts
import { signOut } from "@/auth.ts"

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button type="submit">Sign Out</button>
    </form>
  )
}
```

3.  客户端组件 - 登录

```ts
"use client"
import { signIn } from "next-auth/react"

export function SignIn() {
  return (
    <button onClick={() => signIn("github", { redirectTo: "/dashboard" })}>
      Sign In
    </button>
  )
}
```

4.  客户端组件 - 退出

```ts
"use client"
import { signOut } from "next-auth/react"

export function SignOut() {
  return <button onClick={() => signOut()}>Sign Out</button>
}
```

5.  新建一个登录界面，点击登录按钮，就能看到跳转到 **Github** 授权信息

![](./02-session-data.png)

6.  打开控制台，就能看到 **session** 会话信息，如果没有登录则返回 **null**

![](./03-prisma-adapter.png)

## 适配器 Adapters

在 [next-auth](https://github.com/nextauthjs/next-auth) 中，适配器（adapters）的主要作用是为会话管理和用户数据持久化提供数据库支持。适配器使得 [next-auth](https://github.com/nextauthjs/next-auth) 可以与不同的数据库系统进行交互，以便存储和检索用户信息、会话数据以及其他相关的认证信息，下面以 [Prisma](https://prisma.yoga/) 为例

1.  安装软件包

```bash
pnpm add @prisma/client @auth/prisma-adapter
pnpm add prisma --save-dev
```

2.  设置环境变量

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

3.  配置实例

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

4.  打开 **/src/auth.ts** 文件，配置实例信息

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [],
});
```

5.  在根目录 **prisma/schema.prisma** 创建模型文件

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String          @id @default(cuid())
  name          String?
  email         String          @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  // Optional for WebAuthn support
  Authenticator Authenticator[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

// Optional for WebAuthn support
model Authenticator {
  credentialID         String  @unique
  userId               String
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, credentialID])
}
```

> 以上是 [PostgreSQL](https://www.postgresql.org/) 数据库的模型，如果是其他数据库，请参考：[Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma#schema)

6.  在用户登录后，用户的会话信息就会自动保存到数据库：

![](./06-auth-callback.png)

## 总结

1.  本文只演示了 **Github** 平台的身份鉴权，其他平台应该也大差不差

2.  [next-auth](https://github.com/nextauthjs/next-auth) 还有很多强大的功能需要我们去探索

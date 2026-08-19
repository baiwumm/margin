---
title: "Nest.js 实战 (二)：如何使用 Prisma 和连接 PostgreSQL 数据库"
description: "这篇文章介绍了在 Nest.js 中集成 Prisma ORM 和连接 PostgreSQL 数据库的完整流程，包括 Prisma 模型定义、数据库迁移和模块封装。"
pubDatetime: 2024-07-15T16:23:00+08:00
tags:
  - Nest.js
  - Prisma
draft: false
---

## 什么是 Prisma?

[Prisma](https://github.com/prisma/prisma) 是一个开源的下一代 **ORM**。它包含了以下部分：

- [Prisma Client](https://www.prisma.io/client): 自动生成、类型安全的查询构建器，用于 **Node.js** 和 **TypeScript**

- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview): 数据迁移系统

- [Prisma Studio](https://www.prisma.io/studio): 查询和编辑数据库中数据的图形化界面

[Prisma](https://github.com/prisma/prisma) 客户端可以被用在 任何 **Node.js**（支持的版本）或 **TypeScript** 后端应用中（包括 **Serverless** 应用和微服务）。可以是一个 [REST](https://prisma.yoga/concepts/overview/prisma-in-your-stack/rest/) API，一个 [GraphQL API](https://prisma.yoga/concepts/overview/prisma-in-your-stack/graphql/)，一个 **gRPC API**，或任何其他需要数据库的东西。

## 安装 Prisma

1.  安装 **Prisma CLI** 和依赖包

```bash
pnpm add @prisma/client
pnpm add prisma -D
```

2.  初始化 **Prisma**

```bash
npx prisma init
```

此命令将生成一个基础的 **prisma** 文件夹和 **schema.prisma** 文件，文件目录结构如下：

```text
nest-project
 ├── prisma
 │   ├── schema.prisma // 指定数据库连接并包含数据库 schema
 └── src
```

## 连接数据库

1.  在 **schema.prisma** 文件中配置数据库：

```prisma
generator client {
   provider = "prisma-client-js"
 }

 datasource db {
   provider = "postgresql" // 这里使用 postgreSQL
   url      = env("DATABASE_URL")
 }
```

2.  **.env** 文件中配置数据库连接：

```bash
DATABASE_URL="postgresql://postgres:123456@localhost:5432/vue3-admin?schema=public"
```

## 定义 Prisma 模型

假设现在我们需要开发一个组织管理模块，而且组织是树形层级结构。

1.  在 **schema.prisma** 文件中定义 **Organization** 模型

```prisma
model Organization {
   id        String     @id @default(uuid()) // 主键
   name      String     @unique // 组织名称
   code      String     @unique // 组织编码
   parentId    String?
   parent      Organization? @relation(name: "OrgHierarchy", fields: [parentId], references: [id])
   children Organization[] @relation(name: "OrgHierarchy")
   sort       Int // 排序
   description String? // 组织描述
   icon       String? // 组织图标
   createdAt DateTime @default(now()) // 创建时间
   updatedAt DateTime @updatedAt // 更新时间
 }
```

2.  迁移数据库，将上述模型同步到数据库中:

```bash
npx prisma migrate dev --name init
```

此命令会生成 **prisma/migrations** 目录，文件目录结构如下：

```text
nest-project
 ├── prisma
 │  ├── migrations
 │   └── 220240715074827_init
 │       └── migration.sql
 │   ├── schema.prisma // 指定数据库连接并包含数据库 schema
 └── src
```

3.  每次修改 **schema.prisma** 后，都需要重新生成 **Prisma** 客户端：

```bash
npx prisma generate
```

## 创建 Prisma 模块

1.  在 **src/modules/prisma** 目录中创建 **prisma.service.ts** 文件：

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }
  async onModuleInit() {
    await this.$connect(); // 在模块初始化时连接到数据库
  }

  async onModuleDestroy() {
    await this.$disconnect(); // 在应用程序关闭时断开与数据库的连
  }
}
```

2.  在 **src/modules/prisma** 目录中创建 **prisma.module.ts** 文件：

```ts
import { Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## 使用 Prisma 客户端

1.  创建 **organazation** 模块，新建 **organazation.service.ts** 文件：

```ts
import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/modules/prisma/prisma.service";
import { responseMessage } from "@/utils";

@Injectable()
export class OrganazationService {
  constructor(private prisma: PrismaService) {}

  /**
   * @description: 查询组织列表
   */
  async findAll() {
    const result = await this.prisma.organization.findMany();
    return responseMessage({
      records: result,
    });
  }
}
```

2.  **organazation.controller.ts** 中使用 **OrganazationService** :

```ts
import { Controller, Get } from "@nestjs/common";
import { OrganazationService } from "./organazation.service";

@Controller("organazation")
export class OrganazationController {
  constructor(private readonly organazationService: OrganazationService) {}
  /**
 @description: 查询组织列表
  */
  @Get()
  findAll() {
    return this.organazationService.findAll();
  }
}
```

3.  **organazation.module.ts** 文件：

```ts
import { Module } from "@nestjs/common";

import { PrismaModule } from "@/modules/prisma/prisma.module";

import { OrganazationController } from "./organazation.controller";
import { OrganazationService } from "./organazation.service";

@Module({
  imports: [PrismaModule],
  controllers: [OrganazationController],
  providers: [OrganazationService],
  exports: [OrganazationService],
})
export class OrganazationModule {}
```

4.  **src/app.module.ts** 中注册：

```ts
import { Module } from "@nestjs/common";

import { OrganazationModule } from "@/modules/administrative/organazation/organazation.module";

@Module({
  imports: [OrganazationModule],
})
export class AppModule {}
```

5.  如果 **PrismaModule** 需要全局注册，修改 **prisma.module.ts**，并在 **AppModule** 中导入 ：

```ts
import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Global() // 添加这个装饰器表明这个模块的提供商应该是全局的
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## 最终效果

![](./01-prisma-schema.png)

## 总结

说一下我的使用感受，相比之前用的 [Sequelize](https://www.sequelize.cn/)，感觉在 [Nest.js](https://nestjs.com/) 中使用 [Prisma](https://github.com/prisma/prisma) 更加便捷高效，没有繁琐的配置。

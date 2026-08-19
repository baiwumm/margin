---
title: "Next.js 实战 (十)：中间件的魅力，打造更快更安全的应用"
description: "这篇文章介绍了 Next.js 中间件的应用场景和配置方法，包括身份验证、日志记录、重定向、CORS、限流和国际化路由等常见用法。"
pubDatetime: 2025-01-21T10:33:00+08:00
tags:
  - Next.js
draft: false
---

## 什么是中间件？

在 [Next.js](https://nextjs.org/) 中，[中间件（Middleware）](https://nextjs.org/docs/app/api-reference/file-conventions/middleware)是一种用于处理每个传入请求的功能。它允许你在请求到达页面之前对其进行修改或响应。

通过中间件，你可以实现诸`日志记录身份验证重定向CORS配置压缩`等任务。中间件是构建高效和安全的 `web` 应用的重要组成部分。

## 应用场景

### 身份验证

你可以在中间件中检查用户的身份验证状态，比如从cookie或头部信息中读取JWT令牌，并根据验证结果决定是否允许访问特定页面或API端点。如果验证失败，可以返回401未授权状态码或者重定向到登录页面。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("authToken")?.value;

  if (!token) {
    // 如果没有令牌，则重定向到登录页面
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 继续处理链
  return NextResponse.next();
}
```

### 日志记录

中间件非常适合用来记录所有进入应用程序的请求。这可以帮助监控流量模式、诊断问题以及了解用户行为。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  console.log(`Request to ${request.url} at ${new Date().toISOString()}`);

  // 继续处理链
  return NextResponse.next();
}
```

### 请求/响应转换

可以在请求到达最终目的地之前对请求数据进行预处理，也可以在发送给客户端之前修改响应内容。例如，格式化数据、添加额外的HTTP头、压缩响应体等。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export async function middleware(request) {
  // 修改请求体（假设是JSON格式）
  let modifiedBody = await request.json();
  modifiedBody.message = "Modified message";

  // 创建新的请求实例
  const newReq = new Request(request, {
    body: JSON.stringify(modifiedBody),
  });

  // 获取响应并修改它
  const response = await fetch(request.nextUrl.pathname, {
    method: request.method,
    headers: request.headers,
    body: newReq.body,
  });

  const resClone = await response.clone();
  const data = await resClone.json();
  data.newField = "This is a new field"; // 添加新字段

  // 返回修改后的响应
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: response.headers,
  });
}
```

### 重定向

基于某些条件（如URL路径、查询参数、用户代理等），你可以使用中间件来执行重定向操作，将用户引导至不同的页面。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  // 如果访问的是旧路径，则重定向到新路径
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 继续处理链
  return NextResponse.next();
}
```

### CORS（跨源资源共享）

设置适当的CORS头以允许或限制来自其他域的请求，这对于拥有多个子域名或需要与第三方服务交互的应用非常重要。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();

  // 设置CORS头
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}
```

### 限流

防止滥用API接口，可以通过中间件实现速率限制，限制同一IP地址在一定时间内的请求次数。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";
import rateLimit from "express-rate-limit"; // 需要安装依赖

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100, // 每分钟最多100次请求
});

export function middleware(request) {
  return new Promise((resolve, reject) => {
    limiter(request, {}, err => {
      if (err) {
        return reject(new NextResponse("Too many requests", { status: 429 }));
      }
      resolve(NextResponse.next());
    });
  });
}
```

### 国际化路由

根据用户的语言偏好或地理位置自动调整网站的语言版本。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";

  // 如果不是根路径并且没有包含语言前缀，则添加语言前缀
  if (!request.nextUrl.pathname.startsWith(`/${locale}`)) {
    const url = new URL(request.url);
    url.pathname = `/${locale}${url.pathname}`;
    return NextResponse.redirect(url);
  }

  // 继续处理链
  return NextResponse.next();
}
```

### 静态文件服务

尽管Next.js已经提供了基本的静态文件服务功能，但你可以用中间件来增强这一功能，比如为特定类型的文件提供自定义处理逻辑。

示例代码：

```ts
// middleware.js
import { NextResponse } from "next/server";
import fs from "fs/promises";

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/static-files/")) {
    try {
      const filePath = `./public${path}`;
      const file = await fs.readFile(filePath);
      return new Response(file, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    } catch (error) {
      return NextResponse.next();
    }
  }

  // 继续处理链
  return NextResponse.next();
}
```

## config 配置对象

### matcher

`matcher` 是一个非常强大的配置项，它允许你指定中间件应该应用于哪些路径。你可以通过正则表达式或通配符模式来匹配URL路径。

- **通配符**：可以使用 `*` 来表示任意字符序列。

- **正则表达式**：支持完整的正则表达式语法，但需要使用反斜杠进行转义。

```ts
export const config = {
  matcher: ["/about", "/dashboard/:path*", "/users/:uid"],
};
```

### unstable\_ignorePaths

这个配置项可以让中间件忽略某些路径，即不对其应用中间件逻辑。这对于排除不需要处理的资源或者避免循环重定向等问题非常有用。

```ts
export const config = {
  unstable_ignorePaths: ["/api/*", "/static/*"],
};
```

这里，所有以 `/api` /开头和静态资源路径都将被忽略，不会受到中间件的影响。

### maxDuration

`maxDuration` 定义了中间件函数的最大执行时间（以秒为单位）。如果中间件执行时间超过了这个值，[Next.js](https://nextjs.org/)将会抛出错误。这有助于防止长时间运行的任务阻塞请求处理。

```ts
export const config = {
  maxDuration: 5, // 中间件最大执行时间为5秒
};
```

### regions

`regions` 配置项指定了中间件应该部署到的地理区域。这对于希望减少延迟、提高性能的应用来说非常重要，因为它可以让中间件尽可能靠近用户部署。

```ts
export const config = {
  regions: ["us-east-1", "eu-west-1"], // 在美国东部和欧洲西部部署
};
```

下面是一个结合了多个config配置项的例子：

```ts
// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  // 中间件逻辑...
  return NextResponse.next();
}

export const config = {
  matcher: ["/about", "/dashboard/:path*", "/users/:uid"],
  unstable_ignorePaths: ["/api/*", "/static/*"],
  maxDuration: 10,
  regions: ["us-east-1", "eu-west-1"],
};
```

## 总结

总之，[Next.js](https://nextjs.org/)中间件不仅仅是一个简单的请求处理器，它更像是一个构建模块，允许开发者以一种非侵入式的方式对HTTP请求进行预处理和后处理。这不仅简化了代码逻辑，提高了代码的可维护性，而且还有助于创建更加快速、安全和用户友好的Web体验。无论你是刚开始接触[Next.js](https://nextjs.org/)的新手，还是已经熟悉框架的老手，掌握中间件的使用都将为你的项目带来显著的价值。

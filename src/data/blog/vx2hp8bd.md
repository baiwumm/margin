---
title: "Nest.js 实战 (十二)：优雅地使用事件发布/订阅模块 Event Emitter"
description: "这篇文章介绍了在 Nest.js 中使用 @nestjs/event-emitter 模块实现事件发布/订阅模式的方法，包括事件发布、监听和装饰器简化写法。"
pubDatetime: 2024-09-09T15:01:00+08:00
tags:
  - Nest.js
draft: false
---

## 前言

在使用 [Nest.js](https://nestjs.com/) 构建应用时，特别是对于构建复杂、高并发、分布式的现代 **Web** 应用程序，[事件/发布-订阅模式](https://baike.baidu.com/item/%E5%8F%91%E5%B8%83%E8%AE%A2%E9%98%85/22695073)可以使应用程序更加健壮、灵活和易于扩展，同时还能简化服务间的通信。

本篇文章将详细介绍 [@nestjs/event-emitter](https://github.com/nestjs/event-emitter) 在 [Nest.js](https://nestjs.com/) 应用如何使用。

## @nestjs/event-emitter 是什么？

[@nestjs/event-emitter](https://github.com/nestjs/event-emitter) 是一个 [Nest.js](https://nestjs.com/) 的社区模块，基于强大的 [eventemitter2](https://github.com/EventEmitter2/EventEmitter2) 库，它提供了事件发布/订阅的功能，使得在 [Nest.js](https://nestjs.com/) 应用程序中实现事件驱动架构变得简单。通过使用这个模块，你可以轻松地在服务之间发送事件，并监听这些事件来触发某些行为。

## 具体使用

1.  安装依赖

```bash
pnpm add @nestjs/event-emitter
```

2.  初始化模块

在主模块 **AppModule** 中，导入 **EventEmitterModule** 并注册它

```ts
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [EventEmitterModule.forRoot()],
})
export class AppModule {}
```

3.  发布事件

需要在你的服务中注入 **EventEmitter** 服务，然后可以使用 **emit** 方法来发布事件

```ts
import { Injectable, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class MyService {
  constructor(
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2
  ) {}

  publishEvent() {
    this.eventEmitter.emit("my-event", { message: "Hello from service!" });
  }
}
```

4.  订阅事件

我们在另一个服务中使用 **on** 方法订阅发布的事件

```ts
import { Injectable, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ListenerService {
  constructor(
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2
  ) {
    this.eventEmitter.on("my-event", this.handleEvent);
  }

  private handleEvent(data: any) {
    console.log("Received data:", data);
  }
}
```

5.  使用装饰器简化监听

如果你不想在构造函数中手动绑定事件监听器，可以使用 **@OnEvent** 装饰器来简化这一过程

```ts
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class ListenerService {
  @OnEvent("my-event")
  handleEvent(data: any) {
    console.log("Received data:", data);
  }
}
```

6.  配置模块

如果你需要自定义事件处理器的行为，可以在 **forRoot** 方法中传递配置选项

```ts
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // 配置项
      delimiter: ":", // 定义事件名称中的分隔符，默认值是 '.'。
      wildcard: true, // 启用或禁用通配符支持，如果启用，那么可以使用通配符来订阅事件
      // 当有新的监听器被添加时触发的回调函数
      newListener: (eventName, listener) => {
        console.log(`New listener added for event: ${eventName}`);
      },
      // 当监听器被移除时触发的回调函数
      removeListener: (eventName, listener) => {
        console.log(`Listener removed for event: ${eventName}`);
      },
      // 当事件处理过程中出现错误时的回调函数
      errorHandler: (err, eventName, listener) => {
        console.error(`Error handling event '${eventName}':`, err);
      },
      maxListeners: 10, // 设置最大监听器数量。超过此数量时，将抛出警告
      captureRejections: true, // 是否捕获异步函数的拒绝（rejection）。如果设置为 true，则会在事件处理函数中捕获 Promise.reject
      wrapEmitters: true, // 是否包装事件发射器。如果设置为 true，那么所有的事件发射器都会被包装，以提供更多的功能
      ignoreErrors: true, // 当事件处理过程中出现错误时，是否忽略这些错误。如果设置为 true，则不会抛出错误，而是会被忽略
    }),
  ],
})
export class AppModule {}
```

通过这些配置选项，你可以根据自己的需求定制事件发布/订阅的行为，使其更符合你的应用程序的具体要求。

## 总结

在 [Nest.js](https://nestjs.com/) 中集成 [@nestjs/event-emitter](https://github.com/nestjs/event-emitter) 模块，可以极大地提升应用程序的事件驱动能力。通过采用事件发布/订阅模式，我们可以构建出更为松耦合、易扩展且高度灵活的系统架构。借助其内置的错误处理机制和事件监听管理功能，我们能够构建出更加健壮和可靠的应用程序。总体而言，[@nestjs/event-emitter](https://github.com/nestjs/event-emitter) 是构建现代、响应迅速且具有高度解耦特性的 [Nest.js](https://nestjs.com/) 应用程序的理想选择。

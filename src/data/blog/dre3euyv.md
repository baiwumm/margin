---
title: "Nest.js 实战 (十一)：配置热重载 HMR 给服务提提速"
description: "这篇文章介绍了在 Nest.js 中配置 webpack HMR 热重载的方法，通过减少全量编译来提升开发时的启动效率。"
pubDatetime: 2024-09-02T10:11:00+08:00
tags:
  - Nest.js
draft: false
---

## 前言

[Nest.js](https://nestjs.com/) 服务对应用程序的引导过程影响最大的是 **TypeScript** 编译。每次当我们修改文件时，应用程序都会重新编译整个项目，当应用程序比较庞大时，项目编译会越来越慢，会有很明显的效率低下问题。

那这个问题该怎么解决呢？使用 [webpack](https://github.com/webpack/webpack) **HMR（Hot-Module Replacement）** 能很大程度上降低应用实例化所用的时间。

## 具体教程

1.  安装所需的依赖包

```bash
pnpm add webpack-node-externals run-script-webpack-plugin webpack -D
```

2.  根目录下新增 [webpack](https://github.com/webpack/webpack) 配置文件 **webpack-hmr.config.js**

```ts
const nodeExternals = require("webpack-node-externals");
const { RunScriptWebpackPlugin } = require("run-script-webpack-plugin");

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: ["webpack/hot/poll?100", options.entry],
    externals: [
      nodeExternals({
        allowlist: ["webpack/hot/poll?100"],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new RunScriptWebpackPlugin({ name: options.output.filename }),
    ],
  };
};
```

3.  为了启用 **HMR**，打开应用程序入口文件（ **main.ts** ）并添加一些与 [webpack](https://github.com/webpack/webpack) 相关的说明

```ts
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
```

4.  修改 **package.json** 脚本命令

```text
"start:dev": "nest build --webpack --webpackPath webpack-hmr.config.js --watch"
```

## 总结

如果您想要更高级的配置，比如自定义 [webpack](https://github.com/webpack/webpack) 配置来更好地控制HMR的行为，您可以在 **webpack-hmr.config.js** 文件中进行调整。这个文件位于项目的根目录下，并且包含了一些默认的 [webpack](https://github.com/webpack/webpack) 配置选项。您可以在其中添加或修改 **HMR** 相关的配置。

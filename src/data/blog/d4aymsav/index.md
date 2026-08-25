---
title: "Nuxt.js 实战 (十一)：添加路由 Transition 过渡效果和 Loading 动画"
pubDatetime: 2024-06-20T14:33:00+08:00
tags:
  - Vue.js
  - Nuxt.js
draft: false
description: "这篇文章讲解了如何在 Nuxt3 中为页面和布局添加路由过渡动画、实现首屏全屏 Loading 组件以及页面导航进度条。"
---

## 页面过渡效果

[Nuxt3](https://nuxt.com/) 利用 [Vue](https://cn.vuejs.org/) 的 [<Transition>](https://vuejs.org/guide/built-ins/transition.html#the-transition-component)组件 在页面和布局之间应用过渡效果。

1.  **nuxt.config.ts** 文件配置：

```ts
export default defineNuxtConfig({
  app: {
    pageTransition: { name: "page", mode: "out-in" },
  },
});
```

2.  在页面之间添加过渡效果，在 **app.vue** 文件中添加以下 **CSS**：

```html
<template>
  <NuxtPage />
</template>

<style>
  .page-enter-active,
  .page-leave-active {
    transition: all 0.4s;
  }
  .page-enter-from,
  .page-leave-to {
    opacity: 0;
    filter: blur(1rem);
  }
</style>
```

3.  要为页面设置不同的过渡效果，请在页面的 **definePageMeta** 中设置 **pageTransition** 键：

```vue
<script setup lang="ts">
definePageMeta({
  pageTransition: {
    name: "rotate",
  },
});
</script>
```

> 如果你同时更改布局和页面，这里设置的页面过渡效果将不会运行。相反，你应该设置[布局过渡效果](https://nuxt.com.cn/docs/getting-started/transitions#layout-transitions)。

## 布局过渡效果

1.  **nuxt.config.ts** 文件配置：

```ts
export default defineNuxtConfig({
  app: {
    layoutTransition: { name: "layout", mode: "out-in" },
  },
});
```

2.  在 **app.vue** 文件中添加代码：

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
.layout-enter-active,
.layout-leave-active {
  transition: all 0.4s;
}
.layout-enter-from,
.layout-leave-to {
  filter: grayscale(1);
}
</style>
```

## 首屏加载动画

[Nuxt3](https://nuxt.com/) 并没有直接提供 **API**，但我们利用 [生命周期钩子](https://nuxt.com/docs/api/advanced/hooks#app-hooks-runtime) 来完成我们期望的效果。

1.  新建 **components/FullLoading/index.vue** 文件：

```vue
<template>
  <div
    class="fixed z-[99] flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-900"
  >
    <div
      class="relative h-12 w-12 rotate-[165deg] before:absolute before:top-2/4 before:left-2/4 before:block before:h-[.5em] before:w-[.5em] before:-translate-x-1/2 before:-translate-y-2/4 before:animate-[loaderBefore_2s_infinite] before:rounded before:content-[''] after:absolute after:top-2/4 after:left-2/4 after:block after:h-[.5em] after:w-[.5em] after:-translate-x-1/2 after:-translate-y-2/4 after:animate-[loaderAfter_2s_infinite] after:rounded after:content-['']"
    />
  </div>
</template>
<style>
@keyframes loaderBefore {
  0% {
    width: 0.5em;
    box-shadow:
      1em -0.5em rgba(225, 20, 98, 0.75),
      -1em 0.5em rgba(111, 202, 220, 0.75);
  }

  35% {
    width: 2.5em;
    box-shadow:
      0 -0.5em rgba(225, 20, 98, 0.75),
      0 0.5em rgba(111, 202, 220, 0.75);
  }

  70% {
    width: 0.5em;
    box-shadow:
      -1em -0.5em rgba(225, 20, 98, 0.75),
      1em 0.5em rgba(111, 202, 220, 0.75);
  }

  100% {
    box-shadow:
      1em -0.5em rgba(225, 20, 98, 0.75),
      -1em 0.5em rgba(111, 202, 220, 0.75);
  }
}

@keyframes loaderAfter {
  0% {
    height: 0.5em;
    box-shadow:
      0.5em 1em rgba(61, 184, 143, 0.75),
      -0.5em -1em rgba(233, 169, 32, 0.75);
  }

  35% {
    height: 2.5em;
    box-shadow:
      0.5em 0 rgba(61, 184, 143, 0.75),
      -0.5em 0 rgba(233, 169, 32, 0.75);
  }

  70% {
    height: 0.5em;
    box-shadow:
      0.5em -1em rgba(61, 184, 143, 0.75),
      -0.5em 1em rgba(233, 169, 32, 0.75);
  }

  100% {
    box-shadow:
      0.5em 1em rgba(61, 184, 143, 0.75),
      -0.5em -1em rgba(233, 169, 32, 0.75);
  }
}
</style>
```

2.  **app.vue** 添加代码：

```vue
<script setup lang="ts">
const nuxtApp = useNuxtApp();

// 是否首次加载
const isFullLoading = ref(true);

nuxtApp.hook("page:start", () => {
  isFullLoading.value = true;
});

nuxtApp.hook("page:finish", () => {
  isFullLoading.value = false;
});
</script>

<template>
  <div>
    <!-- 首页加载全屏动画 -->
    <FullLoading v-if="isFullLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
```

## 页面进度条

我们还可以添加一个页面进度条，[Nuxt3](https://nuxt.com/) 提供了 [<NuxtLoadingIndicator> 组件](https://nuxt.com/docs/api/components/nuxt-loading-indicator)，我们直接在 **app.vue** 中添加：

```vue
<template>
  <NuxtLayout>
    <!-- 在页面导航之间显示一个进度条 -->
    <NuxtLoadingIndicator />
    <NuxtPage />
  </NuxtLayout>
</template>
```

## 效果预览

![路由过渡与首屏 Loading 动画效果预览](./01-transition-loading-preview.gif)

## 总结

通过本篇文章我们学习了如何在 [Nuxt3](https://nuxt.com/) 中添加路由切换过渡效果和首屏加载动画，没什么干货，按照官方文档操作就完事了。

**Github 仓库**：[Better Nav](https://github.com/baiwumm/better-nav)

**线上预览**：[一个把常用网址收拾得干干净净的小站](https://nav.baiwumm.com/)

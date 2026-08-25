---
title: "JavaScript 动态执行代码的几种方式"
description: "这篇文章对比了 eval、setTimeout、动态 script 标签和 new Function 这几种在 JavaScript 中动态执行字符串代码的方式，分析了各自的执行时机与作用域特点。"
pubDatetime: 2024-03-07T00:00:00+08:00
tags:
  - JavaScript
draft: false
---

## 场景

在实际的业务开发中，我们可能需要将一段字符串代码动态执行，我们看一个例子：

```js
// 如何将字符串 code 当成 js 代码执行
function exec(code) {}

exec('console.log("Hello world")');
```

## eval 函数

**eval()函数** 是一种接受字符串作为参数，并且可以将接受的字符串转换成js表达式并且立即执行该表达式。

```js
const a = 1;
function exec(code) {
  const a = 2;
  eval(code);
}

exec("console.log(a)");
console.log("sync");

// 执行结果：先输出 2，再输出 sync
```

特点：**同步执行，其作用域为当前执行作用域**

## setTimeout

**setTimeout** 的第一个参数，可以是一个函数，也可以是一个代码串，那么我们就可以利用其特点来实现动态 **js** 脚本

```js
const a = 1;
function exec(code) {
  const a = 2;
  setTimeout(code);
}

exec("console.log(a)");
console.log("sync");

// 执行结果：先输出 sync，再输出 1
```

特点：**异步执行，其作用域为全局作用域**

## 动态 script 标签

**动态script标签** 方法就是我们创建一个 **script** 标签元素对象，将其插入到当前 **Dom** 里

```js
const a = 1;
function exec(code) {
  const a = 2;
  var script = document.createElement("script");
  script.innerHTML = code;
  document.body.appendChild(script);
}

exec("console.log(a)");
console.log("sync");

// 执行结果：先输出 1，再输出 sync
```

特点：**同步执行，其作用域为全局作用域**

## new Function

所有函数方法的原型对象是 **Function** ，我们可以通过 **new Function()** 示例来生成一个方法，再执行就可动态执行 **js** 脚本

```js
const a = 1;
function exec(code) {
  const a = 2;
  new Function(code)();
}

exec("console.log(a)");
console.log("sync");

// 执行结果：先输出 1，再输出 sync
```

特点：**同步执行，其作用域为全局作用域**

## 总结

具体的实现方案可根据当前的业务场景来选择，但是不推荐 **动态script标签**，毕竟是通过操作 **Dom** 实现的。

| 方法             | 同步/异步 | 作用域         |
| ---------------- | --------- | -------------- |
| eval             | 同步      | 当前执行作用域 |
| setTimeout       | 异步      | 全局作用域     |
| 动态 script 标签 | 同步      | 全局作用域     |
| new Function     | 同步      | 全局作用域     |

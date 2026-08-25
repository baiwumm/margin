---
title: "为什么要有箭头函数：消除函数的二义性"
description: "这篇文章从函数的二义性出发，解释了 JavaScript 中箭头函数存在的原因，并对比了箭头函数与 class 在调用方式、this 和原型上的差异。"
pubDatetime: 2024-01-24T00:00:00+08:00
tags:
  - JavaScript
  - 箭头函数
draft: false
---

## 前言

说到[箭头函数](https://es6.ruanyifeng.com/#docs/function#%E7%AE%AD%E5%A4%B4%E5%87%BD%E6%95%B0)，可能很多人的第一反应就是和普通函数的区别：

1. 箭头函数没有 this，普通函数的 this 指向依赖它是如何被调用的
2. 箭头函数没有 arguments 对象，而是通过剩余参数（rest parameters）来获取所有参数的值
3. 箭头函数没有 prototype 原型，不能用作构造函数，而普通函数可以
4. 更加简洁的函数语法

相信一名前端开发者，对于这两者的区别，多多少少都能罗列一些，但是你们有没有想过，JS 已经有普通函数了，为什么还要有箭头函数？难道仅仅只是语法简洁可读性好这么简单？

答案只有一个：**消除函数的二义性**。

## 函数的二义性

那什么是**函数的二义性**呢？

我们创建一个普通函数：

```js
function user() {}
```

这个时候就会出现歧义，因为这个函数有两种调用方式：

```js
function user() {}

// 普通方式调用
user();

// 当做构造函数调用
new user();
```

这就是函数的二义性，至于为什么会出现这种情况，这个就要追溯到 JS 的历史渊源了，我感觉应该是 JS 这门语言在设计上的缺陷。

因为函数的二义性，导致 JS 函数的复杂度直线上升，因为函数在创建的时候，创建者不知道未来的调用者如何调用，可能直接调用，也有可能通过 new 方法调用，这就会存在很大的安全隐患。

后来开发者就在函数的命名上定义了一套规范，普通函数首字母小写，构造函数首字母大写，就像下面这样：

```js
// 普通函数
function user() {}

// 构造函数
function User() {}
```

但毕竟这个不是强约制性的，普通函数依旧可以使用 new 调用，这只能说在一定程度上稍微缓解了这个问题，就像 JS 一些构造函数一样，两种调用方式都可以，比如：

```js
// Number
Number();
new Number();

// Date
Date();
new Date();
```

如果你想普通函数不能通过 new 来调用，你可以这么做：

```js
function User() {
  if (new.target) {
    throw "Uncaught TypeError: User is not a constructor";
  }
}
```

所以调用者压根就不清楚函数的调用方式，这个函数的二义性，会给开发者造成心智负担。

官方一直都知道这个问题，只是一直没解决，后来[ECMAScript 6](https://es6.ruanyifeng.com/)在给 JS 打补丁的时候，引入了两个概念：

1. [箭头函数](https://es6.ruanyifeng.com/#docs/function#%E7%AE%AD%E5%A4%B4%E5%87%BD%E6%95%B0)
2. [class 实例](https://es6.ruanyifeng.com/#docs/class)

它们的作用都是为了**消除函数的二义性**。

箭头函数只能这样调用：

```js
const user = () => {};

// 报错 Uncaught TypeError: user is not a constructor
const a = new user();

// 正确
user();
```

class 只能这样调用：

```js
class User {}

// 报错 Uncaught TypeError: Class constructor User cannot be invoked without 'new'
const user = User();

// 正确
const user = new User();
```

## 箭头函数

**那为什么箭头函数里边没有 this 和原型？**

```js
const user = () => {};
console.log(user.prototype); // undefined
```

因为箭头函数跟实例无关，跟面向对象没关系，它已经脱离了面向对象的范畴，而 this 哪来的？this 来自于面向对象里面的概念，箭头函数里面没有原型的概念是一样的。

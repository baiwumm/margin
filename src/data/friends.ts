/**
 * 友链数据（Friends 页面使用）。
 *
 * 维护说明：
 * - 新增友链：在对应分组数组末尾追加一个对象即可；
 * - `url` 须为可访问的 https 地址；
 * - `avatar` 为头像地址，加载失败时自动降级为「首字母占位」。
 */

export type FriendGroup = {
  /** 分组 id（稳定，用于排序与归属） */
  id: string;
  /** 分组名 */
  name: string;
  /** 分组描述 */
  description: string;
};

export type Friend = {
  /** 站点名称 */
  name: string;
  /** 一句话签名/描述 */
  description: string;
  /** 站点地址（https） */
  url: string;
  /** 头像地址（可选，加载失败自动降级为首字母占位） */
  avatar?: string;
};

/** 分组顺序（按此渲染） */
export const friendGroups: FriendGroup[] = [
  {
    id: "techie",
    name: "技术大咖",
    description: "把技术玩出花的高手们，交换成长与踩坑心得。",
  },
  {
    id: "brothers",
    name: "义结金兰",
    description: "互联网上结下情谊的老朋友，常来常往。",
  },
  {
    id: "kindred",
    name: "志同道合",
    description: "同样热爱记录生活与思考的小伙伴。",
  },
  {
    id: "services",
    name: "应用服务",
    description: "值得收藏的实用站点与聚合服务。",
  },
];

const techie: Friend[] = [
  {
    name: "云栖梦泽",
    description: "linux/android 内核分享",
    url: "https://www.iliuqi.com",
    avatar: "https://www.iliuqi.com/upload/logo.png",
  },
  {
    name: "风记星辰",
    description: "热爱你来过的每度温暖",
    url: "https://thyuu.com",
    avatar: "https://std.thyuu.com/logo.svg",
  },
  {
    name: "回忆航线",
    description: "喜欢捣鼓的博主",
    url: "https://kunkunyu.com",
    avatar:
      "https://api.minio.yyds.pink/moony/files/2025/02/YU%20logo%20-%20%E6%AD%A3%E6%96%B9%E5%BD%A2.svg",
  },
  {
    name: "韩小韩博客",
    description: "运气是计划之外的东西",
    url: "https://www.vvhan.com",
    avatar: "https://q1.qlogo.cn/g?b=qq&nk=1655466387&s=640",
  },
  {
    name: "青萍叙事",
    description: "一个懂技术的产品汪",
    url: "https://blog.lusyoe.com",
    avatar: "https://cdn.lusyoe.com/images/lusyoe-logo.webp",
  },
  {
    name: "清羽飞扬",
    description: "柳影曳曳，清酒孤灯，扬笔撒墨，心境如霜",
    url: "https://blog.liushen.fun/",
    avatar: "https://blog.liushen.fun/info/avatar.ico",
  },
  {
    name: "微风静语",
    description: "在微风中轻语自己，在宁静中书写世界",
    url: "https://www.webjing.cn/",
    avatar: "https://www.webjing.cn/upload/sitelogo.png",
  },
  {
    name: "杜老师说",
    description: "云计算运维讲师，分享运维技术、经验",
    url: "https://dusays.com",
    avatar: "https://cdn.dusays.com/favicon.ico",
  },
  {
    name: "Akilarの糖果屋",
    description: "欢迎光临糖果屋",
    url: "https://akilar.top/",
    avatar:
      "https://npm.elemecdn.com/akilar-friends@latest/avatar/akilar.top.jpg",
  },
  {
    name: "张洪Heo",
    description: "产品设计师、独立开发者、设计与科技领域博主",
    url: "https://blog.zhheo.com/",
    avatar: "https://img.zhheo.com/i/67d8fa75943e4.webp",
  },
  {
    name: "想和道人",
    description: "李懋和，俗名李栋梁。书法、国画爱好者，互联网安全与前端建设者。",
    url: "https://blog.dao.js.cn/",
    avatar:
      "https://cn.cravatar.com/avatar/37d41e2b550633a30f5d41de61c1aa92?s=400&r=G&d=mp&ver=1754413756",
  },
];

const brothers: Friend[] = [
  {
    name: "ZLX STUDIO",
    description: "为音乐创作发电！",
    url: "https://blog.iooioio.com",
    avatar: "https://blog.iooioio.com/upload/ZLXSTUDIO.png",
  },
  {
    name: "Cream薄荷糖",
    description: "在心里种花，人生才不会荒芜",
    url: "https://creammint.cn/",
    avatar: "https://creammint.cn/logo.png",
  },
  {
    name: "益友网站 - 梦想",
    description: "美好的日常生活值得我们去记录",
    url: "https://blog.yiyou.bj.cn/",
    avatar: "https://blog.yiyou.bj.cn/upload/youlogo1.jpeg",
  },
  {
    name: "林间拾语",
    description: "技术与生活的温暖拾遗",
    url: "https://www.lik.cc",
    avatar: "https://www.xhhao.com/upload/logo.png",
  },
  {
    name: "遐说-Dorad",
    description: "❤编程❤摄影，期待走遍万水千山！",
    url: "https://blog.cuger.cn",
    avatar: "https://blog.cuger.cn/images/avatar.png",
  },
  {
    name: "湘铭`Blog",
    description: "湘铭的秘密基地啊！",
    url: "https://xiangming.site/",
    avatar: "https://photo.xiangming.site/img/icologo.png",
  },
  {
    name: "百里飞洋",
    description: "学习笔记与生活乐趣并存",
    url: "https://blog.meta-code.top/",
    avatar: "https://avatars.githubusercontent.com/u/81922999?v=4",
  },
  {
    name: "寒夏摸鱼站",
    description: "稀奇古怪技术集散地",
    url: "https://blog.rainiar.top/",
    avatar: "https://gravatar.webp.se/avatar/1beae7b1b3ca799888552bfcf9930a4e",
  },
  {
    name: "libxcnya.so の Blog",
    description: "静かで奥深い",
    url: "https://blog.xcnya.cn/",
    avatar: "https://cdn.xcnya.cn/imgs/avatar.webp",
  },
];

const kindred: Friend[] = [
  {
    name: "Xuan's blog",
    description: "分享技术教程和学习笔记",
    url: "https://blog.ybyq.wang/",
    avatar: "https://blog.ybyq.wang/usr/themes/handsome/assets/img/avatar.png",
  },
  {
    name: "南枝已谢",
    description: "去年今日此门中，人面桃花相映红",
    url: "https://xgrsir.com",
    avatar: "https://www.xgrsir.com/upload/xgrsir.ico",
  },
  {
    name: "余生",
    description: "好好生活，保持快乐",
    url: "https://yszwbk.com/",
    avatar: "https://www.yszwbk.com/img/tx.jpg",
  },
  {
    name: "周天记",
    description: "我在人间混日子",
    url: "https://zhoutian.com",
    avatar: "https://zhoutian.com/usr/uploads/2026/07/3537875741.jpg",
  },
  {
    name: "刘郎阁",
    description: "一个积极向上的生活探索者！",
    url: "https://vjo.cc/",
    avatar: "https://vjo.cc/usr/uploads/logo.jpeg",
  },
  {
    name: "礼印外盒",
    description: "繁星",
    url: "https://liyinwaihe.com",
    avatar:
      "https://liyinwaihe.com/wp-content/uploads/2025/11/cropped-lywh.png",
  },
  {
    name: "故事的程序猿",
    description: "好好学习，天天向上↑",
    url: "https://blog.lichenghao.cn/",
    avatar: "https://blog.guole.fun/img/gl.jpg",
  },
  {
    name: "ImQi1",
    description: "做技术的分享者、生活的摄影师、时事的评论员",
    url: "https://imqi1.com/",
    avatar:
      "https://cn.cravatar.com/avatar/2841d29eeabab633ae116c7b2c97e3bf?s=512",
  },
  {
    name: "陌子夕生活录",
    description: "年年岁岁花相似，岁岁年年人不同",
    url: "https://mozixi.com",
    avatar: "https://mozixi.com/img/avatar.png",
  },
  {
    name: "六月是只猫",
    description: "做你自己，因为别人都有人做了",
    url: "https://www.lyszm.com/",
    avatar: "https://www.lyszm.com/img/avatar.jpg",
  },
  {
    name: "Z次元",
    description: "探索代码的世界，追寻生活的诗篇",
    url: "https://blog.ahzoo.cn/",
    avatar: "https://ahzoo.cn/img/avatar.webp",
  },
  {
    name: "哈喽！林墨白",
    description: "沉墨满纸，一笑若白",
    url: "https://blog.lmb.blue/",
    avatar: "https://files.blog.lmb.blue/assets/img/logo/pink-black.png",
  },
  {
    name: "QiuMonster's Ocean Book",
    description: "在文字的深海里，拾贝而行。",
    url: "https://blog.somoe.xyz/",
    avatar: "https://blog.somoe.xyz/QiuMonster.jpg",
  },
  {
    name: "alimey. 的个人主页",
    description: "在天际线的彼方，心绪忽轻轻吟。",
    url: "https://www.alimeylab.com",
    avatar: "https://www.alimeylab.com/alimey.jpg",
  },
];

const services: Friend[] = [
  {
    name: "BlogsClub",
    description: "互联网独立博客俱乐部",
    url: "https://www.blogsclub.org/",
    avatar: "https://www.blogsclub.org/usr/uploads/2025/01/2722573488.jpg",
  },
  {
    name: "博友圈",
    description: "博客人的朋友圈，博客收录与文章 RSS 聚合网站",
    url: "https://www.boyouquan.com",
    avatar: "https://www.boyouquan.com/assets/images/sites/logo/logo-small.svg",
  },
  {
    name: "个站商店",
    description: "带社交元素的个人网站发布平台，博客收录网站",
    url: "https://storeweb.cn/",
    avatar: "https://upload.storeweb.cn/image/logo.png",
  },
  {
    name: "开往 | 友链接力",
    description: "友链接力",
    url: "https://www.travellings.cn/",
    avatar: "https://www.travellings.cn/assets/travelling.png",
  },
  {
    name: "笔墨迹",
    description: "致敬还在写博客的你们",
    url: "https://blogscn.fun/",
    avatar: "https://photo.xiangming.site/img/blogscn_icon.png",
  },
  {
    name: "中文独立博客聚合列表",
    description: "又一个聚合网站",
    url: "https://blogroll.online",
    avatar:
      "https://blogroll.online/wp-content/uploads/2026/07/android-chrome-512x512-1.png",
  },
  {
    name: "博客星球",
    description: "每一个博客都是一个独立星球！",
    url: "https://www.blogplanet.cn/",
    avatar: "https://www.blogplanet.cn/img/bkxq.png",
  },
  {
    name: "滔滔网",
    description: "让声音被听见",
    url: "https://teaoteao.com/",
    avatar: "https://teaoteao.com/logo.png",
  },
];

export const friendsByGroup: Record<string, Friend[]> = {
  techie,
  brothers,
  kindred,
  services,
};

/** 全部友链（供统计使用） */
export const allFriends: Friend[] = [
  ...techie,
  ...brothers,
  ...kindred,
  ...services,
];

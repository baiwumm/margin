import type { ContentEntry } from "./contentEntry";
import { getEntryPublishedMs } from "./contentEntry";
import postFilter from "./postFilter";

// 站点口径：按「最近更新时间」（modDatetime ?? pubDatetime）降序。
// 导出层（src/utils/export/collections.ts）按 pubDatetime 降序，是 api-contract
// D40 给小程序的列表契约；文章页上一篇/下一篇沿用本函数的顺序，因此相邻关系
// 可能与小程序不同。改任一侧都要先评估（docs/development.md「排序口径」）。
const getSortedPosts = (posts: ContentEntry[]) =>
  posts
    .filter(postFilter)
    .map(post => ({ post, publishedMs: getEntryPublishedMs(post) }))
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .map(({ post }) => post);

export default getSortedPosts;

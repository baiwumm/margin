/**
 * 数据看板（D34）：热力图按文章 pubDatetime 聚合（本月发布几篇），零 git 依赖。
 */
import type { PostItem } from "./collections";
import type { Stats } from "./types";

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export function buildStats(
  posts: PostItem[],
  galleryCount: number,
  momentCount: number,
  tagCount: number
): Stats {
  const heatmapMap = new Map<string, number>();
  const buckets = new Map<string, { words: number; posts: number }>();
  for (const post of posts) {
    const dk = dateKey(post.pubDatetime);
    heatmapMap.set(dk, (heatmapMap.get(dk) ?? 0) + 1);
    const mk = monthKey(post.pubDatetime);
    const bucket = buckets.get(mk) ?? { words: 0, posts: 0 };
    bucket.words += post.wordCount;
    bucket.posts += 1;
    buckets.set(mk, bucket);
  }

  // 连续写作月数：从最近发文的月份向前数连续非空月
  const months = new Set(posts.map(p => monthKey(p.pubDatetime)));
  let streak = 0;
  if (months.size > 0) {
    const latest = [...months].sort().pop()!;
    const [y0, m0] = latest.split("-").map(Number);
    const cursor = new Date(Date.UTC(y0, m0 - 1, 1));
    while (months.has(monthKey(cursor))) {
      streak++;
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    }
  }

  const heatmap = [...heatmapMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(
    ([date, count]) => ({ date, count })
  );
  const monthBuckets = [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({ month, ...v }));

  return {
    postCount: posts.length,
    galleryCount,
    momentCount,
    tagCount,
    totalWords: posts.reduce((acc, p) => acc + p.wordCount, 0),
    readingMinutes: posts.reduce((acc, p) => acc + p.readingMinutes, 0),
    streakMonths: streak,
    heatmap,
    monthBuckets,
  };
}

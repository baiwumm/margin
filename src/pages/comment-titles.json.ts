import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getEntryPath } from "@/utils/contentEntry";
import postFilter from "@/utils/postFilter";

// 构建期生成 path → 文章标题 的映射，供 margin-comments 仓库的
// giscus 评论通知脚本查询真实标题（giscus discussion.title 只是 path，无中文标题）。
// 输出位置：dist/comment-titles.json → 部署后 https://www.baiwumm.com/comment-titles.json
// 与列表/详情同口径：过滤草稿与未到发布时间的定时文章
export const GET: APIRoute = async () => {
  const blog = await getCollection("blog", postFilter);
  const map: Record<string, string> = {};
  for (const entry of blog) {
    // getEntryPath 返回 "/posts/xxx"（带前导斜杠），giscus title 是 "posts/xxx"（无斜杠）
    const path = getEntryPath(entry).replace(/^\//, "");
    map[path] = entry.data.title;
  }
  return new Response(JSON.stringify(map, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};

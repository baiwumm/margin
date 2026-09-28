import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 文章列表元数据（全量 74 篇，不含正文；D26 不分页）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("posts/index.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

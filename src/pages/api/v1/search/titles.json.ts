import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 检索第一层：标题/标签/摘要/小标题 + 拼音（随首屏，<40KB 即时出结果）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("search/titles.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

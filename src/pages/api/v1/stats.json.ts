import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 数据看板（D34：热力图按 pubDatetime 聚合，零 git 依赖）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("stats.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

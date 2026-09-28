import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 瞬间全量（D20 单文件不分片；月份分组由端上按 pubDatetime 聚合）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("moments/index.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

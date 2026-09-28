import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 标签聚合（blog + galleries；D22 构建期下发 color/colorDark/ink）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("tags/index.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 版本与资源清单：端上启动时唯一主动拉取的文件（If-None-Match 走 304）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("manifest.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 画廊列表（photoCount / cover / tags；图片细节在 <slug>.json）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("galleries/index.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 友链分组（src/data/friends.ts 单一事实源）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("friends.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

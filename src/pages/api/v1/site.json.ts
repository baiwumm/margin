import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 小程序导出端点（api-contract §2）：站点配置。构建期落盘为静态 JSON。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("site.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

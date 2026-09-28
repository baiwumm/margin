import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 检索第二层：bigram 全文倒排（输入 ≥2 字懒加载，≤400KB 硬线）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("search/terms.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

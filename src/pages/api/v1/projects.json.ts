import type { APIRoute } from "astro";
import { buildAll } from "@/utils/export/builders";

// 项目列表（stars/forks 复用 getProjectStats 构建期刷新，失败回退静态数字）。
export const GET: APIRoute = async () => {
  const all = await buildAll();
  return new Response(all.files.get("projects.json")!.json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

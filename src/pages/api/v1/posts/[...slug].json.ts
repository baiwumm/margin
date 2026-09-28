import type { APIRoute, GetStaticPaths } from "astro";
import { buildAll } from "@/utils/export/builders";

// 文章详情（含 Block AST 正文）：74 篇全量落盘。
export const getStaticPaths: GetStaticPaths = async () => {
  const all = await buildAll();
  return [...all.files.entries()]
    .filter(([name]) => name.startsWith("posts/") && name.endsWith(".json") && name !== "posts/index.json")
    .map(([name, file]) => ({
      params: { slug: name.replace(/^posts\//, "").replace(/\.json$/, "") },
      props: { json: file.json },
    }));
};

export const GET: APIRoute = ({ props }) => {
  const { json } = props as { json: string };
  return new Response(json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

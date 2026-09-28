import type { APIRoute, GetStaticPaths } from "astro";
import { buildAll } from "@/utils/export/builders";

// 画廊详情（photos 全量一份文件，D27 不做照片级分片）。
export const getStaticPaths: GetStaticPaths = async () => {
  const all = await buildAll();
  return [...all.files.entries()]
    .filter(([name]) => name.startsWith("galleries/") && name !== "galleries/index.json")
    .map(([name, file]) => ({
      params: { slug: name.replace(/^galleries\//, "").replace(/\.json$/, "") },
      props: { json: file.json },
    }));
};

export const GET: APIRoute = ({ props }) => {
  const { json } = props as { json: string };
  return new Response(json, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

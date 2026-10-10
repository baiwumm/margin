import type { APIRoute } from "astro";
import { version } from "../../package.json";

// README 的动态版本徽章数据源。仓库为私有，shields.io 无法匿名读取 GitHub
// Release，改从公开站点读取构建期固化的 package.json 版本号（版本真源一致）。
export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ version }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

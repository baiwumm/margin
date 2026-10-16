/**
 * 13 端点的数据构建器与全局编排 buildAll()。
 * - 一次进程内 memoize：所有端点共享同一份产物（含 74 篇 toBlocks 的重活）；
 * - buildId = git short sha + 内容 hash（D34，hash 只覆盖 data，不含时变字段）；
 * - 每个文件出线前过体积预算与 URL 断言（D44），违规 throw 构建失败。
 */
import { PUBLIC_SOCIAL_EMAIL, PUBLIC_SOCIAL_GITHUB } from "astro:env/client";
import { friendGroups, friendsByGroup } from "@/data/friends";
import { projects as projectData } from "@/data/projects";
import { getProjectStats } from "@/utils/projectStats";
import { SITE } from "@/config";
import {
  collectGalleries,
  collectMoments,
  collectPosts,
  collectTags,
  coverImageRef,
  type GalleryItem,
  type PostItem,
} from "./collections";
import { toAssetRef } from "./images";
import { codeColors, toBlocks } from "./markdown";
import { buildTitles, buildTerms, blocksPlainText, pinyinKey } from "./search";
import { assertPaletteWCAG } from "./tags";
import { buildStats } from "./stats";
import {
  absolutize,
  assertBudget,
  assertUrls,
  contentHash,
  envelope,
  makeBuildId,
  shortHash,
} from "./base";
import type {
  AssetRef,
  Gallery,
  GalleryPhoto,
  PostDetail,
  PostMeta,
  SitePayload,
} from "./types";

/* ── AssetRef 组装 ───────────────────────────────────────────────── */

// 正文只索引前 16 块：2026-10-16 从 28 收缩，terms.json 回到 400KB 预算内并降单篇增速；
// 口径记录在 api-contract §6（小程序仓库），改动必须两侧同步
const BODY_TERM_BLOCK_CAP = 16;

function photoName(filename: string): string {
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/^\d+[-_]?/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || filename
  );
}

/* ── site.json ───────────────────────────────────────────────────── */

const rawGlobalCss = import.meta.glob<string>("/src/styles/global.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

function accentFromCss(): { accent: string; accentDark: string } {
  // 确定性解析：取「浅色块」与「深色块」各自的 --accent-blue（默认 accent 的实际色值）。
  // 不能用「第一个/最后一个 --accent」启发式——站点已引入五档随机 accent
  // （data-accent 块各有一份 --accent 定义，89025ce），启发式会取错。
  const css = Object.values(rawGlobalCss)[0] ?? "";
  const blues = [...css.matchAll(/--accent-blue:\s*(#[0-9a-fA-F]{3,8})/g)].map(
    m => m[1].toLowerCase()
  );
  // 约定：第一份 = 浅色主题块，第二份 = 深色主题块（global.css 既有顺序）
  return {
    accent: blues[0] ?? "#1158d1",
    accentDark: blues[1] ?? "#008fec",
  };
}

function buildSite(): SitePayload {
  const socials: { name: string; url: string }[] = [];
  if (PUBLIC_SOCIAL_GITHUB)
    socials.push({ name: "GitHub", url: PUBLIC_SOCIAL_GITHUB });
  if (PUBLIC_SOCIAL_EMAIL)
    socials.push({ name: "Mail", url: `mailto:${PUBLIC_SOCIAL_EMAIL}` });
  const nav: { label: string; path: string }[] = [{ label: "首页", path: "/" }];
  if (SITE.showArchives) nav.push({ label: "归档", path: "/archives" });
  nav.push({ label: "标签", path: "/tags" });
  if (SITE.showGalleries) nav.push({ label: "图库", path: "/galleries" });
  if (SITE.showMoments) nav.push({ label: "瞬间", path: "/moments" });
  if (SITE.showFriends) nav.push({ label: "友链", path: "/friends" });
  if (SITE.showProjects) nav.push({ label: "项目", path: "/projects" });
  nav.push({ label: "关于", path: "/about" });
  return {
    title: SITE.title,
    desc: SITE.desc,
    author: SITE.author,
    avatar: absolutize("/avatar.png"), // D39：线上 URL（打包双轨的另一轨在端上）
    socials,
    nav,
    hero: SITE.desc, // D38：hero 文案字段；具体文案 M1 视觉打样定稿
    announcement: null, // D20/D32：一期恒 null
    theme: accentFromCss(),
  };
}

/* ── 文章 ────────────────────────────────────────────────────────── */

const iso = (d: Date) => d.toISOString();

function toPostMeta(post: PostItem): PostMeta {
  return {
    slug: post.slug,
    path: post.path,
    title: post.title,
    description: post.description,
    tags: post.tags,
    pubDatetime: iso(post.pubDatetime),
    modDatetime: post.modDatetime ? iso(post.modDatetime) : null,
    featured: post.featured,
    draft: false,
    ogImage: SITE.dynamicOgImage ? `/posts/${post.slug}/index.png` : null,
    readingTime: post.readingMinutes,
    wordCount: post.wordCount,
  };
}

/* ── 全局编排 ────────────────────────────────────────────────────── */

export interface BuiltFile {
  name: string;
  path: string;
  json: string;
  hash: string;
  bytes: number;
}

export interface BuildOutput {
  buildId: string;
  generatedAt: string;
  /** name → 完整 JSON（含 Envelope）；posts/[slug] 以 "posts/<slug>.json" 为键 */
  files: Map<string, BuiltFile>;
  postDetails: Map<string, PostDetail>;
  unknownTotal: number;
}

let buildPromise: Promise<BuildOutput> | null = null;

export function buildAll(): Promise<BuildOutput> {
  if (!buildPromise) {
    buildPromise = runBuild().catch(error => {
      buildPromise = null; // 失败不缓存，下次调用重试
      throw error;
    });
  }
  return buildPromise;
}

/** 裸域改写（D19）：正文内容里的 https://baiwumm.com/ 统一改写为 www，避免端上依赖 301 */
function finalizeData<T>(data: T): T {
  const json = JSON.stringify(data).replaceAll(
    "https://baiwumm.com/",
    "https://www.baiwumm.com/"
  );
  return JSON.parse(json) as T;
}

async function runBuild(): Promise<BuildOutput> {
  const posts = await collectPosts();
  const galleries = await collectGalleries();
  const momentItems = await collectMoments();
  assertPaletteWCAG(); // D31：10 档 × 明暗 WCAG 断言，违规即构建失败
  const tags = await collectTags(posts, galleries);

  const generatedAt = new Date().toISOString();

  /* 文章详情（重活）：toBlocks + AssetRef */
  const postDetails = new Map<string, PostDetail>();
  let unknownTotal = 0;
  let imageRefCount = 0;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const assets: AssetRef[] = [];
    const assetIndex = new Map<string, number>();
    const resolveImage = async (globKey: string) => {
      const known = assetIndex.get(globKey);
      if (known !== undefined) return known;
      const ref = await toAssetRef(globKey);
      const index = assets.length;
      assets.push(ref);
      assetIndex.set(globKey, index);
      return index;
    };
    const source = rawBlogSource(post.filePath);
    const {
      blocks,
      toc,
      assets: n,
      unknownCount,
    } = await toBlocks(source, post.filePath, resolveImage);
    unknownTotal += unknownCount;
    imageRefCount += n;
    postDetails.set(post.slug, {
      meta: toPostMeta(post),
      blocks,
      toc,
      assets,
      prev: i > 0 ? toPostMeta(posts[i - 1]) : null,
      next: i < posts.length - 1 ? toPostMeta(posts[i + 1]) : null,
      canonicalURL: `https://www.baiwumm.com${post.path}/`,
    });
  }

  /* 画廊详情 */
  const galleryDetails = new Map<string, Gallery>();
  for (const gallery of galleries) {
    const photos: GalleryPhoto[] = [];
    for (const key of gallery.photoKeys) {
      const ref = await toAssetRef(key);
      const filename = key.split("/").pop() ?? "";
      photos.push({
        asset: ref,
        alt: photoName(filename),
        name: photoName(filename),
      });
    }
    const coverKey = coverKeyOf(gallery);
    const cover = await toAssetRef(
      coverKey ?? gallery.photoKeys[0],
      "galleryCover"
    );
    galleryDetails.set(gallery.slug, {
      slug: gallery.slug,
      path: gallery.path,
      title: gallery.title,
      description: gallery.description,
      tags: gallery.tags,
      photoCount: photos.length,
      cover,
      photos,
    });
  }

  /* 瞬间图片 */
  for (const item of momentItems) {
    item.moment.images = await Promise.all(
      item.imageKeys.map(k => toAssetRef(k))
    );
  }

  /* 数据组装（固定顺序，保证内容 hash 稳定） */
  const site = buildSite();
  const postsIndex = posts.map(toPostMeta);
  const galleriesIndex = galleries.map(g => {
    const detail = galleryDetails.get(g.slug)!;
    return {
      slug: g.slug,
      path: g.path,
      title: g.title,
      description: g.description,
      tags: g.tags,
      photoCount: detail.photoCount,
      cover: detail.cover,
    };
  });
  const moments = momentItems.map(m => m.moment);
  const friends = friendGroups.map(group => ({
    title: group.name,
    items: (friendsByGroup[group.id] ?? []).map(f => ({
      name: f.name,
      url: f.url,
      desc: f.description,
      avatar: f.avatar ?? null,
    })),
  }));
  const { projects: effectiveProjects, accountStars, joinedAt } =
    await getProjectStats(projectData);
  // D66：账号级字段（站点 hero 徽章口径：全账号 Stars + 加入 GitHub 时长）加性下发。
  // 逐项冗余（7 项 × 2 字段 ≈200B）而非信封级/新端点——端上缓存层只透传 data，
  // 逐项是既有加性先例（music 三字段同款）；拉取失败时两字段整组缺席，端上回退旧口径。
  const accountExtras = {
    ...(accountStars !== undefined ? { accountStars } : {}),
    ...(joinedAt !== undefined ? { joinedAt } : {}),
  };
  const projectPayloads = effectiveProjects.map(p => ({
    name: p.name,
    url: p.repoUrl,
    desc: p.description,
    lang: p.language ?? null,
    stars: p.stars ?? 0,
    forks: p.forks ?? 0,
    topics: p.tags,
    ...accountExtras,
  }));
  const stats = buildStats(
    posts,
    galleries.length,
    moments.length,
    tags.length
  );
  const titlesDocs = posts.map(p => {
    const detail = postDetails.get(p.slug)!;
    return {
      slug: p.slug,
      title: p.title,
      tags: p.tags,
      description: p.description,
      headings: detail.toc.map(t => t.text),
      pinyin: pinyinKey(`${p.title} ${p.tags.join(" ")}`),
      pubDatetime: iso(p.pubDatetime),
    };
  });
  const titles = buildTitles(
    "",
    titlesDocs.map(d => ({
      slug: d.slug,
      title: d.title,
      tags: d.tags,
      desc: d.description,
      headings: d.headings,
      pinyin: d.pinyin,
      pubDatetime: d.pubDatetime,
    }))
  );
  const terms = buildTerms(
    titlesDocs.map(d => ({
      slug: d.slug,
      title: d.title,
      tags: d.tags,
      description: d.description,
      headings: d.headings,
      bodyText: blocksPlainText(
        postDetails.get(d.slug)!.blocks,
        BODY_TERM_BLOCK_CAP
      ),
    }))
  );

  const orderedData: [string, string, unknown][] = [
    ["site.json", "/api/v1/site.json", site],
    ["posts/index.json", "/api/v1/posts/index.json", postsIndex],
    ["galleries/index.json", "/api/v1/galleries/index.json", galleriesIndex],
    ["moments/index.json", "/api/v1/moments/index.json", moments],
    ["tags/index.json", "/api/v1/tags/index.json", tags],
    ["friends.json", "/api/v1/friends.json", friends],
    ["projects.json", "/api/v1/projects.json", projectPayloads],
    ["stats.json", "/api/v1/stats.json", stats],
    [
      "search/titles.json",
      "/api/v1/search/titles.json",
      { ...titles, buildId: "" },
    ],
    [
      "search/terms.json",
      "/api/v1/search/terms.json",
      { ...terms, buildId: "" },
    ],
  ];

  const dataHash = contentHash(orderedData.map(([, , data]) => data));
  const buildId = makeBuildId(dataHash);
  titles.buildId = buildId;
  terms.buildId = buildId;

  const files = new Map<string, BuiltFile>();
  for (const [name, path, data] of orderedData) {
    const json = JSON.stringify(
      envelope(finalizeData(data), buildId, generatedAt)
    );
    assertBudget(name, json);
    assertUrls(name, json);
    files.set(name, {
      name,
      path,
      json,
      hash: shortHash(JSON.stringify(data)),
      bytes: Buffer.byteLength(json, "utf8"),
    });
  }

  /* 文章详情（per-slug 文件，键 posts/<slug>.json） */
  for (const [slug, detail] of postDetails) {
    const name = `posts/${slug}.json`;
    const json = JSON.stringify(
      envelope(finalizeData(detail), buildId, generatedAt)
    );
    assertBudget("posts/[slug].json", json);
    assertUrls(name, json);
    files.set(name, {
      name,
      path: `/api/v1/posts/${slug}.json`,
      json,
      hash: shortHash(JSON.stringify(detail)),
      bytes: Buffer.byteLength(json, "utf8"),
    });
  }
  /* 画廊详情 */
  for (const [slug, detail] of galleryDetails) {
    const name = `galleries/${slug}.json`;
    const json = JSON.stringify(
      envelope(finalizeData(detail), buildId, generatedAt)
    );
    assertBudget("galleries/[slug].json", json);
    assertUrls(name, json);
    files.set(name, {
      name,
      path: `/api/v1/galleries/${slug}.json`,
      json,
      hash: shortHash(JSON.stringify(detail)),
      bytes: Buffer.byteLength(json, "utf8"),
    });
  }

  /* manifest */
  const resources = [...files.values()].map(f => ({
    name: f.name,
    path: f.path,
    hash: f.hash,
    bytes: f.bytes,
  }));
  const manifestData = {
    schemaVersion: 1,
    buildId,
    generatedAt,
    assetBase: "https://www.baiwumm.com",
    site: { title: SITE.title, author: SITE.author, desc: SITE.desc },
    counts: {
      posts: posts.length,
      galleries: galleries.length,
      moments: moments.length,
      tags: tags.length,
      images: imageRefCount, // D41：正文图片引用数（与 PostDetail.assets 口径一致）
    },
    resources,
    searchIndex: {
      titlesPath: "/api/v1/search/titles.json",
      titlesHash: files.get("search/titles.json")!.hash,
      termsPath: "/api/v1/search/terms.json",
      termsHash: files.get("search/terms.json")!.hash,
      termsMinChars: 2 as const,
      strategy: "bigram" as const,
    },
    // 正文 CodeToken.c 是索引，指向本次构建累积的 globalColors（顺序随文章渲染序变化），
    // 故配色表必须与同一次 buildId 的正文一起下发，端上无法自行重建。
    codeColors: codeColors(),
  };
  const manifestJson = JSON.stringify(
    envelope(manifestData, buildId, generatedAt),
    null,
    2
  );
  assertBudget("manifest.json", manifestJson);
  files.set("manifest.json", {
    name: "manifest.json",
    path: "/api/v1/manifest.json",
    json: manifestJson,
    hash: shortHash(JSON.stringify(manifestData)),
    bytes: Buffer.byteLength(manifestJson, "utf8"),
  });

  return { buildId, generatedAt, files, postDetails, unknownTotal };
}

/* ── 内部工具 ─────────────────────────────────────────────────────── */

const rawBlogFiles = import.meta.glob<string>(
  "/src/data/blog/**/[^_]*.{md,mdx}",
  {
    query: "?raw",
    import: "default",
    eager: true,
  }
);

function rawBlogSource(filePath: string): string {
  const raw = rawBlogFiles[`/${filePath}`];
  if (raw === undefined) {
    throw new Error(`[mp-export] 找不到文章源文件：${filePath}`);
  }
  return raw;
}

function coverKeyOf(gallery: GalleryItem): string | null {
  const ref = coverImageRef(gallery.raw);
  if (!ref) return null;
  // coverImage 可能是 src-root 相对路径（src/data/...）或文件相对路径（./xx）
  const inData = ref.indexOf("src/data/");
  if (inData >= 0) return `/${ref.slice(inData)}`;
  const file = ref.split("/").pop() ?? "";
  const dir = gallery.filePath
    .replace(/^src\/data\/galleries\//, "")
    .split("/")
    .slice(0, -1)
    .join("/");
  return `/src/data/galleries/${dir ? `${dir}/` : ""}${file}`;
}

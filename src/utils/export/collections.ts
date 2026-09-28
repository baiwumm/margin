/**
 * 集合装配层：把 margin 的三集合（blog / galleries / moments）整理成导出层
 * 中间结构，供 builders 使用。排序口径 D40（pubDatetime 降序）。
 */
import { getCollection } from "astro:content";
import postFilter from "../postFilter";
import { getEntryPath, getGallerySlug } from "../contentEntry";
import { getWordCount } from "../readingTime";
import { buildTags } from "./tags";
import type { Moment, Tag } from "./types";

export interface PostItem {
  slug: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  pubDatetime: Date;
  modDatetime: Date | null;
  featured: boolean;
  filePath: string;
  body: string;
  wordCount: number;
  readingMinutes: number;
}

/** 与 readingTime.ts 同一口径的分钟数（那里返回的是格式化中文串） */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(getWordCount(body) / 400));
}

const rawBlog = import.meta.glob<string>("/src/data/blog/**/[^_]*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** 源文件原文（frontmatter 解析与 toBlocks 输入），key = "src/data/blog/..." */
export function rawBlogOf(filePath: string): string | undefined {
  return rawBlog[`/${filePath}`];
}

/** frontmatter 中 coverImage 的相对路径（未写则 undefined） */
export function coverImageRef(raw: string): string | undefined {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? "";
  const m = /^\s*coverImage:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(fm);
  return m?.[1]?.trim() || undefined;
}

export async function collectPosts(): Promise<PostItem[]> {
  const entries = await getCollection("blog", postFilter);
  const items = entries.map(entry => {
    const body = entry.body ?? "";
    const path = getEntryPath(entry); // /posts/<slug>
    return {
      slug: path.replace(/^\/posts\//, ""),
      path,
      title: entry.data.title,
      description: entry.data.description,
      tags: entry.data.tags,
      pubDatetime: new Date(entry.data.pubDatetime),
      modDatetime: entry.data.modDatetime ? new Date(entry.data.modDatetime) : null,
      featured: Boolean(entry.data.featured),
      filePath: entry.filePath ?? "",
      body,
      wordCount: getWordCount(body),
      readingMinutes: readingMinutes(body),
    };
  });
  items.sort((a, b) => b.pubDatetime.getTime() - a.pubDatetime.getTime());
  return items;
}

export interface GalleryItem {
  slug: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  pubDatetime: Date;
  filePath: string;
  raw: string;
  /** 画廊图片 glob 键（文件名字典序 = 站点顺序） */
  photoKeys: string[];
}

const rawGalleries = import.meta.glob<string>("/src/data/galleries/**/index.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const galleryPhotoModules = import.meta.glob<{ default: unknown }>(
  "/src/data/galleries/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}",
  { eager: true }
);

export function galleryPhotoKeys(base: string): string[] {
  const prefix = `/src/data/${base}/`;
  return Object.keys(galleryPhotoModules)
    .filter(path => path.startsWith(prefix) && !path.includes("index"))
    .sort((a, b) => a.localeCompare(b));
}

export async function collectGalleries(): Promise<GalleryItem[]> {
  const entries = await getCollection("galleries", e => !e.data.draft);
  return entries
    .map(entry => {
      const slug = getGallerySlug(entry.id);
      return {
        slug,
        path: getEntryPath(entry),
        title: entry.data.title,
        description: entry.data.description,
        tags: entry.data.tags,
        pubDatetime: new Date(entry.data.pubDatetime),
        filePath: entry.filePath ?? "",
        raw: rawGalleries[`/${entry.filePath ?? ""}`] ?? "",
        photoKeys: galleryPhotoKeys(`galleries/${slug}`),
      };
    })
    .sort((a, b) => b.pubDatetime.getTime() - a.pubDatetime.getTime());
}

export interface MomentItem {
  moment: Moment;
  /** 瞬间图片 glob 键（站点顺序） */
  imageKeys: string[];
}

const momentPhotoModules = import.meta.glob<{ default: unknown }>(
  "/src/data/moments/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}",
  { eager: true }
);

export function momentImageKeys(slug: string): string[] {
  const prefix = `/src/data/moments/${slug}/`;
  return Object.keys(momentPhotoModules)
    .filter(path => path.startsWith(prefix) && !path.includes("index"))
    .sort((a, b) => a.localeCompare(b));
}

export async function collectMoments(): Promise<MomentItem[]> {
  const entries = await getCollection("moments", e => !e.data.draft);
  const items: MomentItem[] = entries.map(entry => {
    const slug = getGallerySlug(entry.id);
    const data: Moment = {
      id: slug,
      text: entry.data.text,
      pubDatetime: new Date(entry.data.pubDatetime).toISOString(),
      images: [],
      tags: entry.data.tags,
      ...(entry.data.music
        ? {
            music: {
              platform: entry.data.music.platform,
              id: entry.data.music.id,
              ...(entry.data.music.audio ? { audio: entry.data.music.audio } : {}),
            },
          }
        : {}),
      ...(entry.data.video
        ? {
            video: {
              ...(entry.data.video.id ? { id: entry.data.video.id } : {}),
              ...(entry.data.video.src ? { src: entry.data.video.src } : {}),
              ...(entry.data.video.poster ? { poster: entry.data.video.poster } : {}),
              ...(entry.data.video.title ? { title: entry.data.video.title } : {}),
              ...(entry.data.video.ratio ? { ratio: entry.data.video.ratio } : {}),
            },
          }
        : {}),
      likes: null,
    };
    return { moment: data, imageKeys: momentImageKeys(slug) };
  });
  items.sort(
    (a, b) =>
      new Date(b.moment.pubDatetime).getTime() -
      new Date(a.moment.pubDatetime).getTime()
  );
  return items;
}

export async function collectTags(
  posts: PostItem[],
  galleries: GalleryItem[]
): Promise<Tag[]> {
  return buildTags(posts, galleries);
}

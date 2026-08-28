import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";
export const GALLERY_PATH = "src/data/galleries";
export const MOMENT_PATH = "src/data/moments";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      coverImage: image().optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

const galleries = defineCollection({
  loader: glob({ pattern: "**/index.{md,mdx}", base: `./${GALLERY_PATH}` }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDatetime: z.date(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      coverImage: image().optional(),
      tags: z.array(z.string()).default([]),
    }),
});

const moments = defineCollection({
  loader: glob({ pattern: "**/index.{md,mdx}", base: `./${MOMENT_PATH}` }),
  schema: z.object({
    pubDatetime: z.date(),
    text: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    // 可选配乐：frontmatter 写 music: { platform, id, audio? }；旧 moments 无此字段时正常渲染
    // audio 为可选显式音频地址（本地 mp3 或稳定直链），优先级高于按 id 自动探测
    music: z
      .object({
        platform: z.enum(["netease", "qq"]).default("netease"),
        id: z.union([z.string(), z.number()]).transform(v => String(v)),
        audio: z.string().optional(),
      })
      .optional(),
    // 可选视频：id（B 站 BV/av 号、视频页链接、b23.tv 短链；非 B 站降级为跳转卡片）
    // 与 src（mp4 直链或 / 开头的站内路径）二选一，同时设置时 src 优先；
    // ratio 如 "9/16"（竖屏），默认 16/9
    video: z
      .object({
        id: z.string().optional(),
        src: z.string().optional(),
        poster: z.string().optional(),
        title: z.string().optional(),
        ratio: z.string().optional(),
      })
      .refine(v => Boolean(v.id || v.src), {
        message: "video 需要提供 id 或 src 之一",
      })
      .optional(),
  }),
});

export const collections = { blog, galleries, moments };

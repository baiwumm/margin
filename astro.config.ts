import { defineConfig, envField, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { remarkRemoveTocMarker } from "./src/utils/remarkRemoveTocMarker";
import { remarkLinkCard } from "./src/utils/remarkLinkCard";
import { remarkMusic } from "./src/utils/remarkMusic";
import { remarkVideo } from "./src/utils/remarkVideo";
import { rehypeExternalLinks } from "./src/utils/rehypeExternalLinks";
import { SITE } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  devToolbar: {
    enabled: false, // disable the Astro Dev Toolbar (dev-only UI)
  },
  integrations: [
    mdx({
      extendMarkdownConfig: true,
    }),
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkRemoveTocMarker,
        remarkLinkCard,
        remarkMusic,
        remarkVideo,
      ],
      rehypePlugins: [rehypeExternalLinks],
    }),
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // ── Personal / social links ──────────────────────────────────────────
      // Set these in .env (never commit personal data to the repo).
      // Any variable left unset will simply hide that social link.
      // See .env.example for the full list.
      PUBLIC_SOCIAL_GITHUB: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_SOCIAL_X: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_SOCIAL_LINKEDIN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_SOCIAL_EMAIL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // Giscus comments (GitHub Discussions). The repo must be public.
      PUBLIC_GISCUS_REPO: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_REPO_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_CATEGORY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_CATEGORY_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },

  fonts: [
    // 全站字体统一为 Maple Mono CN（经 Layout 内联的 /giscus/fonts CSS 加载），
    // Wotfard 仅作字体栈兜底；此前的 Sriracha / Fira Code 注册已被移除
    {
      name: "Wotfard",
      cssVariable: "--font-wotfard",
      fallbacks: ["sans-serif"],
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/wotfard.woff2"],
          },
        ],
      },
    },
  ],
});

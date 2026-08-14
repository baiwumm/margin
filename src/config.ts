/**
 * Env helper: prefer real process.env (platform env vars), fall back to
 * import.meta.env so values from the project's .env file also work.
 * Astro only injects .env into import.meta.env, not into process.env.
 */
const getEnv = (key: string): string => {
  const procValue = (process.env as Record<string, string | undefined>)[key];
  if (procValue) return procValue;
  try {
    const metaValue = (import.meta.env as Record<string, unknown>)[key];
    return typeof metaValue === "string" ? metaValue : "";
  } catch {
    return "";
  }
};

export const SITE = {
  website: "https://baiwumm.com/",
  author: "白雾茫茫丶",
  profile: getEnv("PUBLIC_SOCIAL_GITHUB"), // set in .env
  desc: "边白 · 记录代码、思考与灵感",
  title: "Margin",
  ogImage: "devosfera-og.webp", // located in the public folder
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 12,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showGalleries: true,
  showGalleriesInIndex: true, // Show galleries in the general paginated list (only if showGalleries is true)
  showBackButton: true, // show back button in post detail
  showTagsInCards: true, // show tag pills at the bottom of post cards
  showCoverImages: false, // show cover images (OG) in post cards (requires pnpm build in dev mode)
  indexPostsGrid: false, // show recent/featured posts in grid layout on the home page (like /posts page)
  heroTerminalPrompt: {
    prefix: "~", // highlighted part on the left
    path: "/ready-to-go", // central prompt text
    suffix: "$", // terminal symbol on the right
  },
  backdropEffects: {
    cursorGlow: true, // cursor tracking with soft halo
    grain: true, // background visual noise layer
  },
  editPost: {
    enabled: true,
    text: "编辑本文",
    url: getEnv("PUBLIC_EDIT_POST_URL"), // set in .env
  },
  // Giscus comments (GitHub Discussions driven, zero backend, zero maintenance).
  // The repo must be public; you can use a dedicated public repo just for
  // comments so the blog source stays private.
  // repo / repoId / category / categoryId come from .env (generate at https://giscus.app).
  comments: {
    enabled: true, // set to true after PUBLIC_GISCUS_* are configured
    giscus: {
      repo: getEnv("PUBLIC_GISCUS_REPO"),
      repoId: getEnv("PUBLIC_GISCUS_REPO_ID"),
      category: getEnv("PUBLIC_GISCUS_CATEGORY"),
      categoryId: getEnv("PUBLIC_GISCUS_CATEGORY_ID"),
      mapping: "pathname",
      strict: "0",
      reactionsEnabled: "1",
      emitMetadata: "1",
      inputPosition: "top",
      lang: "zh-CN",
    },
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "America/Guatemala", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  introAudio: {
    enabled: true, // show/hide intro player in home and compact player while navigating
    // src: path to file (relative to /public or absolute URL). Example: "/intro.mp3" or "https://example.com/stream"
    src: "https://fluxfm.streamabc.net/flx-chillhop-mp3-128-8581707",
    // src: "/audio/intro-web.mp3",
    isStream: true, // true for radio/live stream URLs (example: https://fluxfm.streamabc.net/flx-chillhop-mp3-128-8581707)
    label: "LOFI", // display label in player
    duration: 30, // duration in seconds (used for local files, ignored on streams)
  },
} as const;

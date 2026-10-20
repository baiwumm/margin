// Constants
const THEME = "theme";
const ACCENT = "accent";
const LIGHT = "light";
const DARK = "dark";
const DEFAULT_ACCENT = "blue";

// localStorage 访问防护：隐私模式/禁用存储时直接抛 SecurityError，
// 不捕获会中断整个主题脚本（按钮绑定全部失效）
function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 存储不可用时仅放弃持久化，不影响本次会话的主题生效 */
  }
}

// Initial color scheme
// Can be "light", "dark", or empty string for system's prefers-color-scheme
const initialColorScheme = "dark";

function getPreferTheme(): string {
  // get theme data from local storage (user's explicit choice)
  const currentTheme = getStorageItem(THEME);
  if (currentTheme) return currentTheme;

  // return initial color scheme if it is set (site default)
  if (initialColorScheme) return initialColorScheme;

  // return user device's prefer color scheme (system fallback)
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Use existing theme value from inline script if available, otherwise detect
let themeValue = window.theme?.themeValue ?? getPreferTheme();

// Accent color value, restored from the inline FOUC script or localStorage
let accentValue =
  document.firstElementChild?.getAttribute("data-accent") ??
  getStorageItem(ACCENT) ??
  DEFAULT_ACCENT;

function setPreference(): void {
  setStorageItem(THEME, themeValue);
  reflectPreference();
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);

  // Sync segmented theme options (Light / Dark)
  document.querySelectorAll("[data-theme-option]").forEach(btn => {
    const isActive = btn.getAttribute("data-theme-option") === themeValue;
    btn.setAttribute("aria-pressed", String(isActive));
  });

  // Get a reference to the body element
  const body = document.body;

  // Check if the body element exists before using getComputedStyle
  if (body) {
    // Get the computed styles for the body element
    const computedStyles = window.getComputedStyle(body);

    // Get the background color property
    const bgColor = computedStyles.backgroundColor;

    // Set the background color in <meta theme-color ... />
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }

  // accent 的明暗两套色值不同，主题切换时 favicon 也要重算
  reflectFavicon();
}

// Favicon 与页头 logo 同源。外框深浅跟随「浏览器」而不是站点的 data-theme，
// 因为标签页底色由浏览器决定；版心块烤入当前 accent。色值镜像 src/styles/global.css。
const FAVICON_FG_LIGHT = "#303036";
const FAVICON_FG_DARK = "#f6f7f8";
const FAVICON_FALLBACK_ACCENT = "#008fec";

function reflectFavicon(): void {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) return;

  const accent =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || FAVICON_FALLBACK_ACCENT;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12.5 12.5 75 75" width="100" height="100">` +
    `<style>` +
    `.f{stroke:${FAVICON_FG_LIGHT}}.b{fill:${accent}}.d{fill:${FAVICON_FG_LIGHT}}` +
    `@media (prefers-color-scheme: dark){` +
    `.f{stroke:${FAVICON_FG_DARK}}.b{fill:${accent}}.d{fill:${FAVICON_FG_DARK}}` +
    `}</style>` +
    `<rect class="f" x="15" y="15" width="70" height="70" rx="12" fill="none" stroke-width="5"/>` +
    `<rect class="b" x="27" y="27" width="34" height="32" rx="6"/>` +
    `<circle class="d" cx="72" cy="72" r="4.5" opacity=".6"/>` +
    `</svg>`;

  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function reflectAccent(): void {
  document.firstElementChild?.setAttribute("data-accent", accentValue);

  // Sync accent color dots
  document.querySelectorAll("[data-accent-option]").forEach(btn => {
    const isActive = btn.getAttribute("data-accent-option") === accentValue;
    btn.setAttribute("aria-pressed", String(isActive));
  });

  reflectFavicon();
}

// Update the global theme API
if (window.theme) {
  window.theme.setPreference = setPreference;
  window.theme.reflectPreference = reflectPreference;
} else {
  window.theme = {
    themeValue,
    setPreference,
    reflectPreference,
    getTheme: () => themeValue,
    setTheme: (val: string) => {
      themeValue = val;
    },
  };
}

// Ensure theme is reflected (in case body wasn't ready when inline script ran)
reflectPreference();
reflectAccent();

function setThemeFeature(): void {
  // set on load so screen readers can get the latest value on the button
  reflectPreference();

  // Segmented theme options (Light / Dark)
  document.querySelectorAll("[data-theme-option]").forEach(btn => {
    const freshOption = btn.cloneNode(true) as Element;
    btn.replaceWith(freshOption);
    freshOption.addEventListener("click", () => {
      const val = freshOption.getAttribute("data-theme-option");
      if (val === LIGHT || val === DARK) {
        themeValue = val;
        window.theme?.setTheme(themeValue);
        setPreference();
      }
    });
  });
}

// Set up theme features after page load
setThemeFeature();

function setAccentFeature(): void {
  reflectAccent();

  // Accent color dots, rebound on every page load / swap
  document.querySelectorAll("[data-accent-option]").forEach(btn => {
    const freshDot = btn.cloneNode(true) as Element;
    btn.replaceWith(freshDot);
    freshDot.addEventListener("click", () => {
      const val = freshDot.getAttribute("data-accent-option");
      if (!val) return;
      accentValue = val;
      setStorageItem(ACCENT, accentValue);
      reflectAccent();
    });
  });
}

setAccentFeature();

// Runs on view transitions navigation
document.addEventListener("astro:after-swap", () => {
  setThemeFeature();
  setAccentFeature();
});

// Set theme-color value before page transition
// to avoid navigation bar color flickering in Android dark mode
document.addEventListener("astro:before-swap", event => {
  const astroEvent = event;
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (bgColor) {
    astroEvent.newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
});

// sync with system changes
// 仅当用户从未显式选择过主题（localStorage 无记录）时跟随系统，
// 避免把用户手动保存的偏好覆盖掉；跟随系统时只更新视图，不写回存储
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    if (getStorageItem(THEME)) return;
    themeValue = isDark ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    reflectPreference();
  });

// Constants
const THEME = "theme";
const ACCENT = "accent";
const LIGHT = "light";
const DARK = "dark";
const DEFAULT_ACCENT = "blue";

// Initial color scheme
// Can be "light", "dark", or empty string for system's prefers-color-scheme
const initialColorScheme = "dark";

function getPreferTheme(): string {
  // get theme data from local storage (user's explicit choice)
  const currentTheme = localStorage.getItem(THEME);
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
  localStorage.getItem(ACCENT) ??
  DEFAULT_ACCENT;

function setPreference(): void {
  localStorage.setItem(THEME, themeValue);
  reflectPreference();
}

function reflectPreference(): void {
  document.firstElementChild?.setAttribute("data-theme", themeValue);

  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

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
}

function reflectAccent(): void {
  document.firstElementChild?.setAttribute("data-accent", accentValue);

  // Sync accent color dots
  document.querySelectorAll("[data-accent-option]").forEach(btn => {
    const isActive = btn.getAttribute("data-accent-option") === accentValue;
    btn.setAttribute("aria-pressed", String(isActive));
  });
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

  // now this script can find and listen for clicks on the control
  const toggleTheme = () => {
    themeValue = themeValue === LIGHT ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
  };

  const themeBtn = document.querySelector("#theme-btn");
  const themeBtnMobile = document.querySelector("#theme-btn-mobile");

  // Remove previous listeners to avoid duplicates on view transitions
  const freshBtn = themeBtn?.cloneNode(true) as Element | null;
  if (themeBtn && freshBtn) {
    themeBtn.replaceWith(freshBtn);
    freshBtn.addEventListener("click", toggleTheme);
  }

  const freshBtnMobile = themeBtnMobile?.cloneNode(true) as Element | null;
  if (themeBtnMobile && freshBtnMobile) {
    themeBtnMobile.replaceWith(freshBtnMobile);
    freshBtnMobile.addEventListener("click", toggleTheme);
  }

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
      localStorage.setItem(ACCENT, accentValue);
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
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    themeValue = isDark ? DARK : LIGHT;
    window.theme?.setTheme(themeValue);
    setPreference();
  });

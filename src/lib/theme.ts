export type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "notaku_theme";

export function getStoredTheme(): ThemeValue {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(THEME_KEY) as ThemeValue) || "system";
}

export function applyTheme(theme: ThemeValue) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem(THEME_KEY, theme);
}

export function getResolvedTheme(theme: ThemeValue): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light"; // fallback for SSR
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initTheme() {
  if (typeof window === "undefined") return;

  // Apply initial theme
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);

  // Listen for system changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    const currentTheme = getStoredTheme();
    if (currentTheme === "system") {
      applyTheme("system");
    }
  };

  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}

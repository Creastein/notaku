export type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "notaku_theme";

export function getStoredTheme(): ThemeValue {
  return "dark";
}

export function applyTheme(theme: ThemeValue) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.classList.add("dark");

  localStorage.setItem(THEME_KEY, "dark");
}

export function getResolvedTheme(theme: ThemeValue): "light" | "dark" {
  return "dark";
}

export function initTheme() {
  if (typeof window === "undefined") return;

  applyTheme("dark");
  return () => {};
}

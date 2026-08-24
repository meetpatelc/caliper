import { useEffect, useState } from "react";
import { THEME_COLOR, THEME_KEY } from "@/lib/instrument";

export type Theme = "light" | "dark";

export const THEME_EVENT = "instrument:theme";

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function syncThemeColor(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
}

function paintTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme !== "dark");
  syncThemeColor(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function applyTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  paintTheme(theme);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(readTheme());
    const sync = () => setTheme(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (localStorage.getItem(THEME_KEY)) return;
      paintTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onScheme);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", onScheme);
    };
  }, []);
  return [theme, applyTheme];
}
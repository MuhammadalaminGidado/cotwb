"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

function getCookieTheme(): Theme | null {
  const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)(?:;|$)/);
  return match ? (match[1] as Theme) : null;
}

function setCookieTheme(theme: Theme) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `theme=${theme}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

function getTransitionMs(root: HTMLElement): number {
  const raw = window.getComputedStyle(root).getPropertyValue("--duration-medium").trim();
  const ms = Number(raw.replace("ms", ""));
  return Number.isFinite(ms) && ms > 0 ? ms : 300;
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? "light");

  useEffect(() => {
    const cookieTheme = getCookieTheme();
    const resolved: Theme = cookieTheme ?? initialTheme ?? "light";
    if (resolved !== theme) {
      setTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    } else {
      document.documentElement.setAttribute("data-theme", resolved);
    }
  }, [initialTheme, theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      root.classList.add("theme-transition");
      window.setTimeout(() => root.classList.remove("theme-transition"), getTransitionMs(root));
    }
    root.setAttribute("data-theme", next);
    setCookieTheme(next);
    setTheme(next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

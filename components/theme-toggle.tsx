"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg"
    >
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}

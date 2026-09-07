"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={toggleTheme}
      className="relative inline-flex h-7 w-[52px] items-center rounded-full border p-0.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg aria-checked:border-accent-primary aria-checked:bg-accent-primary border-border bg-surface"
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg shadow-sm will-change-transform transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none ${isDark ? "translate-x-[24px]" : "translate-x-0"}`}
      >
        <span className="relative block h-4 w-4">
          <SunIcon
            aria-hidden="true"
            className={`absolute inset-0 h-4 w-4 text-accent-primary transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none ${isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
          />
          <MoonIcon
            aria-hidden="true"
            className={`absolute inset-0 h-4 w-4 text-text-primary transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-reduce:transition-none ${isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"}`}
          />
        </span>
      </span>
    </button>
  );
}

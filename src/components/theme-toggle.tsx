"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { STORAGE_KEY, type Theme } from "@/lib/theme";
import { applyTheme, readTheme, useTheme } from "@/lib/use-theme";

/**
 * Light / dark switch. Both icons are rendered and swapped in CSS off
 * `data-theme`, so the server markup is already correct at first paint; the
 * pressed state comes from the store once hydrated.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();

  // With no saved choice the page tracks the system setting live.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        // Storage blocked: still follow the system.
      }
      applyTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Темна тема"
      aria-pressed={theme === null ? undefined : theme === "dark"}
      className={[
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg ring-1 ring-inset ring-hairline transition-[background-color,box-shadow,scale] duration-fast ease-out-quint hover:bg-fg/[0.06] hover:ring-hairline-strong active:scale-[0.94]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sun
        aria-hidden="true"
        size={18}
        strokeWidth={1.75}
        className="transition-[opacity,rotate] duration-medium ease-out-quint dark:rotate-90 dark:opacity-0"
      />
      <Moon
        aria-hidden="true"
        size={18}
        strokeWidth={1.75}
        className="absolute -rotate-90 opacity-0 transition-[opacity,rotate] duration-medium ease-out-quint dark:rotate-0 dark:opacity-100"
      />
    </button>
  );
}

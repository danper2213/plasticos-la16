"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className="inline-flex size-9 items-center justify-center rounded-md border border-border/80 bg-background/90 text-slate-600 transition-colors hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
      >
        <span className="size-4" aria-hidden />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border/80 bg-background/90 text-slate-600 transition-colors hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

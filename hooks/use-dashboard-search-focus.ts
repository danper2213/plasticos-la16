"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardSearchBarHandle } from "@/components/layout/dashboard-search-bar";
import {
  isDashboardSearchShortcut,
  isTypingElement,
} from "@/lib/dashboard-search-shortcut";

export function useDashboardSearchFocus() {
  const heroObservedRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<DashboardSearchBarHandle>(null);
  const stickySearchBarRef = useRef<DashboardSearchBarHandle>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  const focusSearch = useCallback(() => {
    if (heroVisible) {
      heroObservedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      searchBarRef.current?.focus();
      return;
    }
    stickySearchBarRef.current?.focus();
  }, [heroVisible]);

  useEffect(() => {
    const node = heroObservedRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setHeroVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return;
      if (!isDashboardSearchShortcut(event)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      focusSearch();
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [focusSearch]);

  return {
    heroObservedRef,
    searchBarRef,
    stickySearchBarRef,
    heroVisible,
    focusSearch,
  };
}

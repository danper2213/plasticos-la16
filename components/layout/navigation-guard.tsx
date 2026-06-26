"use client";

import * as React from "react";

type NavigationBlocker = {
  enabled: boolean;
  allowPathPrefix?: string;
  onAttemptLeave: (href: string) => void;
};

type NavigationGuardContextValue = {
  registerBlocker: (blocker: NavigationBlocker | null) => void;
  tryNavigate: (href: string, e: React.MouseEvent) => boolean;
};

const NavigationGuardContext = React.createContext<NavigationGuardContextValue | null>(
  null,
);

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const blockerRef = React.useRef<NavigationBlocker | null>(null);

  const registerBlocker = React.useCallback((blocker: NavigationBlocker | null) => {
    blockerRef.current = blocker;
  }, []);

  const tryNavigate = React.useCallback((href: string, e: React.MouseEvent) => {
    const blocker = blockerRef.current;
    if (!blocker?.enabled) return true;

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return true;
    }
    if (url.origin !== window.location.origin) return true;

    const nextPath = url.pathname + url.search + url.hash;
    const currentPath =
      window.location.pathname + window.location.search + window.location.hash;
    if (nextPath === currentPath) return true;
    if (blocker.allowPathPrefix && url.pathname.startsWith(blocker.allowPathPrefix)) {
      return true;
    }

    e.preventDefault();
    blocker.onAttemptLeave(nextPath);
    return false;
  }, []);

  const value = React.useMemo(
    () => ({ registerBlocker, tryNavigate }),
    [registerBlocker, tryNavigate],
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuardRegistration(
  enabled: boolean,
  onAttemptLeave: (href: string) => void,
  options?: { allowPathPrefix?: string },
) {
  const ctx = React.useContext(NavigationGuardContext);
  const onAttemptLeaveRef = React.useRef(onAttemptLeave);
  onAttemptLeaveRef.current = onAttemptLeave;

  React.useEffect(() => {
    if (!ctx) return;
    if (!enabled) {
      ctx.registerBlocker(null);
      return;
    }
    ctx.registerBlocker({
      enabled: true,
      allowPathPrefix: options?.allowPathPrefix,
      onAttemptLeave: (href) => onAttemptLeaveRef.current(href),
    });
    return () => ctx.registerBlocker(null);
  }, [ctx, enabled, options?.allowPathPrefix]);
}

export function useNavigationGuardClick() {
  const ctx = React.useContext(NavigationGuardContext);
  return React.useCallback(
    (href: string, e: React.MouseEvent) => {
      if (!ctx) return true;
      return ctx.tryNavigate(href, e);
    },
    [ctx],
  );
}

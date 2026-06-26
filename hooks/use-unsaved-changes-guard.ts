"use client";

import * as React from "react";

export type UnsavedChangesGuardOptions = {
  /** When true, browser refresh/close shows the native unsaved-changes prompt. */
  enabled: boolean;
};

/**
 * Registers `beforeunload` while `enabled`. In-app navigation is handled via
 * `NavigationGuardProvider` + `useNavigationGuardRegistration` (sidebar Links).
 */
export function useUnsavedChangesGuard(options: UnsavedChangesGuardOptions): void {
  const { enabled } = options;

  React.useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);
}

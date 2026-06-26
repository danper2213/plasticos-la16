"use client";

import * as React from "react";
import Image from "next/image";
import { Sidebar, type UserRole } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NavigationGuardProvider } from "@/components/layout/navigation-guard";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  userRole: UserRole;
  userEmail: string | null;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, userEmail, children }: DashboardShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(true);

  return (
    <NavigationGuardProvider>
      <div className="min-h-screen bg-background">
        <Sidebar userRole={userRole} desktopExpanded={sidebarExpanded} />
      <div
        className={cn(
          "min-h-screen bg-background dark:bg-[#121212]",
          "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
          sidebarExpanded ? "lg:pl-64" : "lg:pl-0",
        )}
      >
        <Header
          userEmail={userEmail}
          userRole={userRole}
          sidebarExpanded={sidebarExpanded}
          onToggleSidebar={() => setSidebarExpanded((v) => !v)}
        />
        <main className="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-auto p-4 lg:p-6">
          <div className="flex-1">{children}</div>
          <footer className="mt-auto rounded-t-2xl border-t border-border bg-card/80 backdrop-blur-sm px-4 py-5 md:px-8 md:py-6 shadow-[0_-1px_0_0_hsl(var(--border))]">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt=""
                  width={64}
                  height={26}
                  className="h-6 w-auto object-contain opacity-90"
                />
                <span className="text-sm font-semibold tracking-tight text-muted-foreground">
                  PLASTICOS <span className="text-primary">LA 16</span>
                </span>
              </div>
              <span className="text-xs text-muted-foreground/80">
                © {new Date().getFullYear()} Todos los derechos reservados
              </span>
            </div>
          </footer>
        </main>
      </div>
      </div>
    </NavigationGuardProvider>
  );
}

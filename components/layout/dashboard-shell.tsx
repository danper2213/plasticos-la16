"use client";

import * as React from "react";
import { Sidebar, type UserRole } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
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
        <main className="overflow-auto p-4 lg:p-6">
          {children}
          <DashboardFooter />
        </main>
      </div>
      </div>
    </NavigationGuardProvider>
  );
}

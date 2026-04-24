"use client";

import * as React from "react";
import { ChevronsLeft, ChevronsRight, Menu, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar, type UserRole } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";

interface HeaderProps {
  userEmail: string | null;
  userRole: UserRole;
  /** Escritorio: menú lateral expandido */
  sidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({ userEmail, userRole, sidebarExpanded = true, onToggleSidebar }: HeaderProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/80 bg-background/90 px-4 shadow-[0_1px_0_0_hsl(var(--border)/0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 dark:bg-[#121212]/92 dark:shadow-[0_1px_0_0_rgba(39,39,42,0.6)] dark:supports-[backdrop-filter]:bg-[#121212]/80 lg:gap-4 lg:px-6">
      <div className="flex shrink-0 items-center">
        {/* Mobile menu: Sheet with Sidebar */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0" showCloseButton={true}>
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <Sidebar userRole={userRole} variant="mobile" onNavigateClick={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {onToggleSidebar ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 lg:flex dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
            onClick={onToggleSidebar}
            aria-expanded={sidebarExpanded}
            aria-label={sidebarExpanded ? "Ocultar menú lateral" : "Mostrar menú lateral"}
          >
            {sidebarExpanded ? (
              <ChevronsLeft className="size-5" aria-hidden />
            ) : (
              <ChevronsRight className="size-5" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
              aria-label="User menu"
            >
              <User className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="font-normal text-muted-foreground">Sesión iniciada como</span>
              <p className="truncate text-sm font-medium text-foreground">
                {userEmail ?? "—"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void signOut();
              }}
              className="cursor-pointer"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  Receipt,
  Landmark,
  CalendarCheck,
  Truck,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "admin" | "employee";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "employee"] },
  { href: "/dashboard/customers", label: "Clientes", icon: Users, roles: ["admin", "employee"] },
  { href: "/dashboard/products", label: "Productos", icon: Package, roles: ["admin", "employee"] },
  { href: "/dashboard/inventory", label: "Inventario", icon: Warehouse, roles: ["admin", "employee"] },
  { href: "/dashboard/receivables", label: "Cuentas por Cobrar", icon: Receipt, roles: ["admin", "employee"] },
  { href: "/dashboard/banks", label: "Cuentas Bancarias", icon: Landmark, roles: ["admin"] },
  { href: "/dashboard/closures", label: "Cierres de Caja", icon: CalendarCheck, roles: ["admin"] },
  { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck, roles: ["admin"] },
  { href: "/dashboard/payables", label: "Cuentas por Pagar", icon: CreditCard, roles: ["admin"] },
];

interface SidebarProps {
  userRole: UserRole;
  className?: string;
  /** When true, sidebar is rendered inside a Sheet (mobile). No fixed positioning. */
  variant?: "default" | "mobile";
  /** Optional callback when a nav link is clicked (e.g. close mobile sheet). */
  onNavigateClick?: () => void;
}

export function Sidebar({ userRole, className, variant = "default", onNavigateClick }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  const content = (
    <nav className={cn("flex flex-col gap-1.5 p-4", variant === "mobile" && "pt-8")}>
      <div className="mb-4 px-3 py-2 rounded-xl border border-border bg-card/80 dark:border-zinc-800/80 dark:bg-zinc-900/30">
        <span className="text-base font-black tracking-tight text-foreground dark:text-zinc-100">
          PLASTICOS <span className="text-primary">LA 16</span>
        </span>
      </div>
      {filteredItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigateClick}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 border",
              isActive
                ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.2)] dark:bg-blue-500/20 dark:text-blue-400 dark:ring-blue-500/30 dark:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200 dark:hover:border-zinc-700/50"
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", isActive ? "text-primary dark:text-blue-400" : "text-muted-foreground group-hover:text-foreground dark:text-zinc-500 dark:group-hover:text-zinc-200")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  if (variant === "mobile") {
    return (
      <div className={cn("flex h-full flex-col bg-zinc-100 dark:bg-black", className)}>
        {content}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col lg:flex",
        "bg-zinc-100 dark:bg-black",
        className
      )}
    >
      {content}
    </aside>
  );
}

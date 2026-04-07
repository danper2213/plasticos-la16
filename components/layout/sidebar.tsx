"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  Receipt,
  Landmark,
  Calendar,
  Calculator,
  Truck,
  CreditCard,
  UserCog,
  Clapperboard,
  Mail,
  Settings,
  Globe,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "admin" | "employee";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children: NavLink[];
}

type NavItem = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item && Array.isArray((item as NavGroup).children);
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "employee"] },
  { href: "/dashboard/customers", label: "Clientes", icon: Users, roles: ["admin", "employee"] },
  { href: "/dashboard/products", label: "Productos", icon: Package, roles: ["admin", "employee"] },
  { href: "/dashboard/inventory", label: "Inventario", icon: Warehouse, roles: ["admin", "employee"] },
  { href: "/dashboard/receivables", label: "Cuentas por Cobrar", icon: Receipt, roles: ["admin", "employee"] },
  {
    label: "Página Web",
    icon: Globe,
    roles: ["admin"],
    children: [
      { href: "/dashboard/social", label: "Contenido Social", icon: Clapperboard, roles: ["admin"] },
      { href: "/dashboard/newsletter", label: "Newsletter", icon: Mail, roles: ["admin"] },
      { href: "/dashboard/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
    ],
  },
  {
    label: "Administración",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      { href: "/dashboard/banks", label: "Cuentas Bancarias", icon: Landmark, roles: ["admin"] },
      { href: "/dashboard/closures", label: "Cierres Diario", icon: Calendar, roles: ["admin"] },
      { href: "/dashboard/closures/samit", label: "Cierres SAMIT", icon: Calculator, roles: ["admin"] },
      { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck, roles: ["admin"] },
      { href: "/dashboard/payables", label: "Cuentas por Pagar", icon: CreditCard, roles: ["admin"] },
      { href: "/dashboard/usuarios", label: "Usuarios", icon: UserCog, roles: ["admin"] },
    ],
  },
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
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (isNavGroup(item) && item.children.some((c) => pathname.startsWith(c.href))) {
          next[item.label] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function renderItem(item: NavItem) {
    if (isNavGroup(item)) {
      if (!item.roles.includes(userRole)) return null;
      const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
      const Icon = item.icon;
      const isOpen = openGroups[item.label] ?? isGroupActive;

      return (
        <div key={item.label} className="space-y-1">
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-transparent",
              isGroupActive ? "text-primary dark:text-blue-400" : "text-muted-foreground dark:text-zinc-500"
            )}
            onClick={() =>
              setOpenGroups((prev) => ({
                ...prev,
                [item.label]: !(
                  prev[item.label] ??
                  isGroupActive
                ),
              }))
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="size-4 shrink-0" />
              {item.label}
            </span>
            {isOpen ? (
              <ChevronDown className="size-3 shrink-0" />
            ) : (
              <ChevronRight className="size-3 shrink-0" />
            )}
          </button>
          {isOpen ? (
            <div className="ml-2 space-y-1 border-l-2 border-border pl-2">
              {item.children
                .filter((c) => c.roles.includes(userRole))
                .map((child) => {
                  const isActive =
                    pathname === child.href || (child.href !== "/dashboard" && pathname.startsWith(child.href));
                  const ChildIcon = child.icon;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigateClick}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30 dark:bg-blue-500/20 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                      )}
                    >
                      <ChildIcon className="size-3.5 shrink-0" />
                      {child.label}
                    </Link>
                  );
                })}
            </div>
          ) : null}
        </div>
      );
    }
    if (!item.roles.includes(userRole)) return null;
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
  }

  const content = (
    <nav className={cn("flex flex-col gap-1.5 p-4", variant === "mobile" && "pt-8")}>
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30"
        aria-label="Ir al inicio"
      >
        <Image src="/logo.png" alt="" width={80} height={32} className="h-8 w-auto shrink-0 object-contain" />
        <span className="text-base font-black tracking-tight text-foreground dark:text-zinc-100">
          PLASTICOS <span className="text-primary">LA 16</span>
        </span>
      </Link>
      {navItems.map(renderItem)}
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

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
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationGuardClick } from "@/components/layout/navigation-guard";

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

const administracionGroup: NavGroup = {
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
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "employee"] },
  administracionGroup,
  { href: "/dashboard/customers", label: "Clientes", icon: Users, roles: ["admin", "employee"] },
  { href: "/dashboard/products", label: "Productos", icon: Package, roles: ["admin", "employee"] },
  { href: "/dashboard/escaneo", label: "Escaneo", icon: ScanLine, roles: ["admin", "employee"] },
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: FileText, roles: ["admin", "employee"] },
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
];

interface SidebarProps {
  userRole: UserRole;
  className?: string;
  /** When true, sidebar is rendered inside a Sheet (mobile). No fixed positioning. */
  variant?: "default" | "mobile";
  /** Optional callback when a nav link is clicked (e.g. close mobile sheet). */
  onNavigateClick?: () => void;
  /** Escritorio: menú lateral visible (animación al colapsar). Ignorado en variant mobile. */
  desktopExpanded?: boolean;
}

export function Sidebar({
  userRole,
  className,
  variant = "default",
  onNavigateClick,
  desktopExpanded = true,
}: SidebarProps) {
  const pathname = usePathname();
  const tryNavigate = useNavigationGuardClick();
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

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (!tryNavigate(href, e)) return;
    onNavigateClick?.();
  }

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
              "flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wider",
              isGroupActive
                ? "text-primary dark:text-blue-400"
                : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-zinc-500 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200",
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
            <div className="ml-2 space-y-1 border-l-2 border-border/70 pl-2 dark:border-zinc-700/80">
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
                      onClick={(e) => handleNavClick(child.href, e)}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30 dark:bg-blue-500/20 dark:text-blue-400"
                          : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/55 dark:hover:text-zinc-100",
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
        onClick={(e) => handleNavClick(item.href, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          isActive
            ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/30 dark:bg-blue-500/20 dark:text-blue-400 dark:shadow-[0_0_12px_rgba(59,130,246,0.15)] dark:ring-blue-500/30"
            : "border-transparent text-slate-600 hover:border-border/60 hover:bg-slate-100/90 hover:text-slate-900 dark:border-transparent dark:text-zinc-400 dark:hover:border-zinc-700/50 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            isActive
              ? "text-primary dark:text-blue-400"
              : "text-slate-500 group-hover:text-slate-800 dark:text-zinc-500 dark:group-hover:text-zinc-100",
          )}
        />
        {item.label}
      </Link>
    );
  }

  const content = (
    <nav
      className={cn(
        "flex flex-col gap-1.5 p-4 pb-8",
        variant === "mobile" && "pt-10 pr-12"
      )}
    >
      <Link
        href="/dashboard"
        onClick={(e) => handleNavClick("/dashboard", e)}
        className="mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-border/80 bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/60"
        aria-label="Ir al inicio"
      >
        <Image src="/logo.png" alt="" width={80} height={32} className="h-8 w-auto shrink-0 object-contain" />
        <span className="text-base font-black tracking-tight text-slate-900 dark:text-zinc-100">
          PLASTICOS <span className="text-primary">LA 16</span>
        </span>
      </Link>
      {navItems.map(renderItem)}
    </nav>
  );

  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col border-r border-border/80 bg-card dark:border-zinc-800/80 dark:bg-zinc-950",
          className,
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col overflow-hidden border-r border-border/80 bg-card shadow-[1px_0_16px_-8px_rgba(15,23,42,0.08)] lg:flex",
        "dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none",
        "transform-gpu transition-transform duration-300 ease-out motion-reduce:transition-none",
        !desktopExpanded && "lg:pointer-events-none lg:-translate-x-full",
        className,
      )}
      aria-hidden={!desktopExpanded ? true : undefined}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {content}
      </div>
    </aside>
  );
}

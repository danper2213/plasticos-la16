/** Rutas del dashboard que exigen rol admin (debe coincidir con sidebar). */
export const ADMIN_DASHBOARD_PREFIXES = [
  "/dashboard/banks",
  "/dashboard/closures",
  "/dashboard/registro-diario",
  "/dashboard/proveedores",
  "/dashboard/payables",
  "/dashboard/usuarios",
  "/dashboard/social",
  "/dashboard/newsletter",
  "/dashboard/configuracion",
] as const;

export function isAdminDashboardPath(pathname: string): boolean {
  return ADMIN_DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

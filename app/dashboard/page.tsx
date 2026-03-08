import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  PackageX,
  AlertCircle,
  CheckCircle2,
  Package,
  Receipt,
} from "lucide-react";
import { getDashboardSummary, getRecentActivity } from "./_lib/dashboard-data";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const [summary, recentActivity] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(),
  ]);
  const today = new Date();
  const dateLabel = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const dateLabelCapitalized =
    dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const hasAlerts =
    summary.outOfStockCount > 0 || summary.overduePayablesCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Resumen Operativo - PLASTICOS LA 16
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateLabelCapitalized}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Cobrar (Pendiente)
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCop(summary.pendingReceivables)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Pagar (Pendiente)
            </CardTitle>
            <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCop(summary.pendingPayables)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos Agotados
            </CardTitle>
            <PackageX className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                summary.outOfStockCount > 0
                  ? "text-destructive"
                  : "text-foreground"
              )}
            >
              {summary.outOfStockCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturas Vencidas
            </CardTitle>
            <AlertCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                summary.overduePayablesCount > 0
                  ? "text-destructive"
                  : "text-foreground"
              )}
            >
              {summary.overduePayablesCount}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Alertas Prioritarias
        </h2>
        {!hasAlerts ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
              <p className="text-sm font-medium text-primary">
                Todo al día. No hay alertas pendientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {summary.outOfStockCount > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/10">
                <CardContent className="flex items-center gap-3 py-4">
                  <PackageX className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Hay {summary.outOfStockCount} producto(s) agotado(s).
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      Revise el módulo de Inventario.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/inventory">Ver Inventario</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {summary.overduePayablesCount > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/10">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Hay {summary.overduePayablesCount} factura(s) vencida(s) por pagar.
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      Revise el módulo de Cuentas por Pagar.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/payables">Ver Cuentas por Pagar</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <p className="text-sm text-muted-foreground">
              Últimas actualizaciones
            </p>
          </CardHeader>
          <CardContent>
            <RecentActivity items={recentActivity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Accesos directos
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="default" className="gap-2">
              <Link href="/dashboard/inventory">
                <Package className="size-4" />
                Inventario
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/receivables">
                <Receipt className="size-4" />
                Cuentas por Cobrar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
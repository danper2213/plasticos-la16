"use client";

import * as React from "react";
import Image from "next/image";
import { ScanLine, Package, Boxes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCop } from "@/lib/format";
import { formatInventoryQuantity } from "@/lib/inventory-quantity";
import { getProductByScanCode, type ProductWithRelations } from "@/app/dashboard/products/actions";
import { PriceSimulatorPanels } from "@/components/products/price-simulator-panels";
import { cn } from "@/lib/utils";

/** Tras dejar de escribir (lector o teclado), busca sin Enter. */
const SCAN_DEBOUNCE_MS = 320;
/** Evita búsquedas con 1–2 caracteres sueltos. */
const MIN_CHARS_AUTO_SEARCH = 3;

export function ScannerKioskClient() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [product, setProduct] = React.useState<ProductWithRelations | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  React.useEffect(() => {
    focusInput();
  }, [focusInput]);

  const resolveScan = React.useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) {
      focusInput();
      return;
    }
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    try {
      const row = await getProductByScanCode(code);
      if (row) {
        setProduct(row);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
      setValue("");
      focusInput();
    }
  }, [focusInput]);

  React.useEffect(() => {
    if (loading) return undefined;
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS_AUTO_SEARCH) return undefined;
    const id = window.setTimeout(() => {
      const latest = inputRef.current?.value.trim() ?? "";
      if (latest.length < MIN_CHARS_AUTO_SEARCH) return;
      void resolveScan(latest);
    }, SCAN_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [value, loading, resolveScan]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("scan-input") as HTMLInputElement | null;
    const raw = input?.value ?? value;
    void resolveScan(raw);
  }

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || loading) return;
    e.preventDefault();
    void resolveScan(e.currentTarget.value);
  }

  const stockLabel =
    product?.stock_quantity == null
      ? "Sin registro en bodega"
      : `En bodega: ${formatInventoryQuantity(Number(product.stock_quantity))}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ScanLine className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Escaneo de producto</h1>
            <p className="text-sm text-muted-foreground">
              Con al menos {MIN_CHARS_AUTO_SEARCH} caracteres, la búsqueda corre sola al dejar de escribir
              (~{SCAN_DEBOUNCE_MS / 1000} s). Enter sigue forzando búsqueda al instante.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-2">
          <label className="sr-only" htmlFor="scan-input">
            Código de barras o QR
          </label>
          <Input
            id="scan-input"
            name="scan-input"
            ref={inputRef}
            autoComplete="off"
            spellCheck={false}
            placeholder="Esperando escaneo…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onScanKeyDown}
            onBlur={() => {
              window.setTimeout(focusInput, 100);
            }}
            className="h-12 rounded-xl border-dashed text-base font-mono tracking-wide"
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProduct(null);
                setNotFound(false);
                setValue("");
                focusInput();
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Buscando…</p>
      ) : null}

      {notFound ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">Producto no encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No hay un producto activo con ese código. Revisá la etiqueta o ejecutá la migración de{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">scan_code</code> en Supabase.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {product ? (
        <div className="space-y-6">
          <Card className="overflow-hidden border-border shadow-md">
            <CardHeader className="border-b border-border bg-muted/30 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {product.scan_code || "—"}
                    </Badge>
                    <Badge variant="outline">{product.category_name}</Badge>
                  </div>
                  <CardTitle className="text-2xl font-black leading-tight tracking-tight">
                    {product.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {product.presentation}
                    {product.supplier_name ? ` · ${product.supplier_name}` : null}
                  </p>
                </div>
                {product.image_url ? (
                  <div className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:mx-0">
                    <Image
                      src={product.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <Boxes className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inventario
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{stockLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <Package className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Precios de lista
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Costo: <span className="font-semibold text-foreground">{formatCop(product.cost)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Venta:{" "}
                    <span className="font-semibold text-foreground">{formatCop(product.selling_price)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Simulador de precios</CardTitle>
              <p className="text-xs text-muted-foreground">No modifica el producto.</p>
            </CardHeader>
            <CardContent className={cn(product.packaging ? "" : "pb-2")}>
              <PriceSimulatorPanels key={product.id} product={product} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

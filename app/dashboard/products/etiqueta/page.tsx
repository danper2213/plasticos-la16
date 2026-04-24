import Link from "next/link";
import { redirect } from "next/navigation";
import { getProductById } from "@/app/dashboard/products/actions";
import { ProductLabelClient } from "./product-label-client";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Etiqueta QR | Productos",
};

export default async function ProductEtiquetaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id?.trim()) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Falta el parámetro id del producto.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">Ir a productos</Link>
        </Button>
      </div>
    );
  }

  const product = await getProductById(id.trim());
  if (!product) {
    redirect("/dashboard/products");
  }

  const code = product.scan_code?.trim();
  if (!code) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-muted-foreground">
          Este producto aún no tiene código de escaneo. Ejecutá la migración{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">20260417180000_products_scan_code</code> en
          Supabase y recargá.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">Volver</Link>
        </Button>
      </div>
    );
  }

  return <ProductLabelClient productName={product.name} scanCode={code} />;
}

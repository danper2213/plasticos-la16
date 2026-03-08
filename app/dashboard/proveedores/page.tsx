import { getSuppliers } from "./actions";
import { ProveedoresClient } from "./proveedores-client";

export default async function ProveedoresPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6">
      <ProveedoresClient suppliers={suppliers} />
    </div>
  );
}

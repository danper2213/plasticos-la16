import { getInventoryMovements, getActiveProducts } from "./actions";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const [movements, products] = await Promise.all([
    getInventoryMovements(),
    getActiveProducts(),
  ]);

  return (
    <div className="space-y-6">
      <InventoryClient movements={movements} products={products} />
    </div>
  );
}

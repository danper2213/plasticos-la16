import { getCustomers } from "@/app/dashboard/customers/actions";
import { getRecentQuotes } from "./actions";
import { CotizacionesClient } from "./cotizaciones-client";

export default async function CotizacionesPage() {
  const [customers, recentQuotes] = await Promise.all([getCustomers(), getRecentQuotes()]);

  return (
    <CotizacionesClient
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      recentQuotes={recentQuotes}
    />
  );
}

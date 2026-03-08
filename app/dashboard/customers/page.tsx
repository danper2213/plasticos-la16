import { getCustomers } from "./actions";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <CustomersClient customers={customers} />
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerForm } from "@/components/customers/customer-form";
import { deleteCustomer, type Customer } from "./actions";
import { toast } from "sonner";

interface CustomersClientProps {
  customers: Customer[];
}

export function CustomersClient({ customers: initialCustomers }: CustomersClientProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  function handleNewCustomer() {
    setSelectedCustomer(null);
    setSheetOpen(true);
  }

  function handleEdit(customer: Customer) {
    setSelectedCustomer(customer);
    setSheetOpen(true);
  }

  async function handleDelete(customer: Customer) {
    if (!confirm("¿Está seguro de que desea eliminar este cliente?")) return;
    const result = await deleteCustomer(customer.id);
    if (result.success) {
      toast.success("Cliente eliminado correctamente");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el cliente");
    }
  }

  function handleFormSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        icon={UserRound}
        title="Clientes"
        description="Gestión de clientes y datos de contacto."
        actions={
          <Button onClick={handleNewCustomer} className="h-11 rounded-xl w-fit sm:w-auto">
            + Nuevo Cliente
          </Button>
        }
      />

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="w-[70px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay clientes registrados. Haga clic en &quot;+ Nuevo Cliente&quot; para agregar uno.
                </TableCell>
              </TableRow>
            ) : (
              initialCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.tax_id ?? "—"}</TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {customer.address ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Abrir menú">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(customer)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(customer)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={selectedCustomer}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

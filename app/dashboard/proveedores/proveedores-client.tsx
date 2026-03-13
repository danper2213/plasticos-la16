"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Landmark,
  Phone,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteSupplier, type Supplier } from "./actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { triggerSuccess } from "@/lib/confetti";
import { cn } from "@/lib/utils";
import { BankLogo } from "@/components/bank-logo";

const listVariants = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

function SupplierCard({
  supplier,
  onOpen,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onOpen: (s: Supplier) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const hasBank = !!(supplier.bank_name || supplier.account_number?.trim());
  const hasPhone = !!supplier.phone?.trim();

  return (
    <motion.div
      layout
      variants={cardVariants}
      whileHover={{ zIndex: 50, y: -4 }}
      className="relative min-w-0 rounded-xl border-2 border-border bg-card shadow-md overflow-hidden flex flex-col cursor-pointer transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(supplier)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(supplier)}
        className="flex-1 flex flex-col min-h-0"
        aria-label={`Ver proveedor ${supplier.name}`}
      >
        <header className="relative flex flex-row items-start justify-between gap-2 p-3 pr-4 border-b border-border/80 bg-muted/40">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground truncate leading-tight flex items-center gap-2">
              <Building2 className="size-4 shrink-0 text-primary/80" />
              {supplier.name}
            </p>
            <p className="text-xs font-medium tabular-nums text-muted-foreground mt-0.5 flex items-center gap-1">
              <FileText className="size-3 shrink-0" />
              NIT {supplier.tax_id?.trim() || "—"}
            </p>
          </div>
        </header>

        <div className="p-4 flex flex-col gap-3">
          {hasBank ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2.5">
              <BankLogo bankName={supplier.bank_name} size="sm" transparent className="shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-0.5">
                {supplier.bank_name && (
                  <p className="text-sm font-semibold text-foreground truncate">{supplier.bank_name}</p>
                )}
                {supplier.account_number?.trim() && (
                  <p className="text-xs text-muted-foreground font-medium tabular-nums">
                    Cuenta: {supplier.account_number.trim()}
                  </p>
                )}
                {supplier.bank_agreement?.trim() && (
                  <p className="text-[10px] text-muted-foreground">Convenio: {supplier.bank_agreement.trim()}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 flex items-center justify-center gap-2">
              <Landmark className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="text-xs font-medium text-muted-foreground">Sin datos bancarios</span>
            </div>
          )}

          {hasPhone ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-primary/80" />
              <span className="text-sm font-semibold tabular-nums truncate">{supplier.phone!.trim()}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">Sin teléfono</span>
            </div>
          )}
        </div>
      </div>

      <footer
        className="border-t border-border/80 p-2 flex flex-wrap items-center justify-end gap-1.5 bg-muted/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label="Eliminar proveedor"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </footer>
    </motion.div>
  );
}

interface ProveedoresClientProps {
  suppliers: Supplier[];
}

export function ProveedoresClient({ suppliers: initialSuppliers }: ProveedoresClientProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return initialSuppliers;
    const q = searchQuery.trim().toLowerCase();
    return initialSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tax_id ?? "").toLowerCase().includes(q) ||
        (s.bank_name ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.account_number ?? "").toLowerCase().includes(q)
    );
  }, [initialSuppliers, searchQuery]);

  function handleNewSupplier() {
    setSelectedSupplier(null);
    setSheetOpen(true);
  }

  function handleEdit(supplier: Supplier, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedSupplier(supplier);
    setSheetOpen(true);
  }

  function openDeleteDialog(supplier: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    const result = await deleteSupplier(supplierToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setSupplierToDelete(null);
    if (result.success) {
      triggerSuccess();
      toast.success("Proveedor eliminado correctamente");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar el proveedor");
    }
  }

  function handleFormSuccess() {
    router.refresh();
  }

  function handleCardClick(supplier: Supplier) {
    handleEdit(supplier);
  }

  return (
    <div className="pt-8 px-4 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Proveedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de proveedores y datos bancarios.
          </p>
        </div>
        <Button
          onClick={handleNewSupplier}
          className="h-10 gap-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20 w-fit"
        >
          <Plus className="size-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search bar + count card */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border mb-6">
        <div className="relative flex-1 w-full min-w-[200px]">
          <div className="rounded-lg bg-background border-2 border-input shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <Input
              placeholder="Buscar por nombre, NIT, banco o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-11 pr-4 text-base w-full rounded-lg border-0 bg-transparent focus-visible:ring-0"
              aria-label="Buscar proveedor"
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md px-4 py-3 shadow-sm shrink-0 min-w-[120px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
            <Building2 className="size-3.5 text-primary/80" />
            {searchQuery.trim() ? "Resultados" : "Proveedores"}
          </p>
          <p className="text-xl font-black tabular-nums text-foreground">
            {filteredSuppliers.length}
          </p>
        </div>
      </div>

      {/* Cards */}
      {filteredSuppliers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground"
        >
          {initialSuppliers.length === 0
            ? "No hay proveedores registrados. Haz clic en «Nuevo Proveedor» para agregar uno."
            : "Ningún resultado coincide con la búsqueda."}
        </motion.div>
      ) : (
        <div className="overflow-visible">
          <AnimatePresence mode="wait">
            <motion.div
              key={`suppliers-list-${searchQuery}`}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-6 pb-8 items-stretch"
            >
              {filteredSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onOpen={handleCardClick}
                  onEdit={(e) => handleEdit(supplier, e)}
                  onDelete={(e) => openDeleteDialog(supplier, e)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {supplierToDelete?.name}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupplierForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        supplier={selectedSupplier}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

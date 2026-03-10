"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useRef } from "react";
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
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

function formatSupplierAccount(supplier: Supplier): string {
  const parts: string[] = [];
  if (supplier.bank_name) parts.push(supplier.bank_name);
  if (supplier.account_type) parts.push(supplier.account_type);
  const account = supplier.account_number?.trim() ?? "";
  const main = parts.length ? `${parts.join(" ")}: ${account || "—"}` : (account || "—");
  if (supplier.bank_agreement?.trim()) {
    return `${main} (Convenio: ${supplier.bank_agreement.trim()})`;
  }
  return main;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el: HTMLDivElement = container;
    function onWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
              ref={scrollContainerRef}
              key={`suppliers-list-${searchQuery}`}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "flex flex-nowrap overflow-x-auto overflow-y-visible gap-6 pt-6 pb-8 snap-x snap-mandatory payables-cards-scroll items-start"
              )}
            >
              {filteredSuppliers.map((supplier) => (
                <motion.div
                  key={supplier.id}
                  layout
                  variants={cardVariants}
                  whileHover={{ zIndex: 50, y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative min-w-[350px] max-w-[400px] w-[350px] h-[320px] shrink-0 snap-start rounded-2xl border border-border bg-card shadow-lg overflow-hidden flex flex-col cursor-pointer transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(supplier)}
                    onKeyDown={(e) => e.key === "Enter" && handleCardClick(supplier)}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Editar proveedor ${supplier.name}`}
                  >
                    <header className="relative flex flex-col gap-2 p-4 border-b border-border bg-gradient-to-br from-muted/60 to-muted/40 border-l-4 border-l-primary shrink-0">
                      <h3 className="text-xl font-black text-foreground truncate leading-tight flex items-center gap-2">
                        <Building2 className="size-5 shrink-0 text-primary" aria-hidden />
                        {supplier.name}
                      </h3>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                        <FileText className="size-3.5" aria-hidden />
                        NIT {supplier.tax_id?.trim() || "—"}
                      </span>
                    </header>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Contacto</span>
                      </div>
                      <div className="px-4 pb-5 flex flex-col gap-3">
                      {(supplier.bank_name || supplier.account_number) ? (
                        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <BankLogo bankName={supplier.bank_name} size="md" transparent className="shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              {supplier.bank_name ? (
                                <p className="text-sm font-bold text-foreground truncate">
                                  {supplier.bank_name}
                                </p>
                              ) : null}
                              {supplier.account_type ? (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/80">Tipo:</span>{" "}
                                  <span className="font-semibold">{supplier.account_type}</span>
                                </p>
                              ) : null}
                              {supplier.account_number?.trim() ? (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/80">Cuenta:</span>{" "}
                                  <span className="font-bold tabular-nums tracking-wide">{supplier.account_number.trim()}</span>
                                </p>
                              ) : null}
                              {supplier.bank_agreement?.trim() ? (
                                <p className="text-xs text-muted-foreground pt-0.5">
                                  <span className="font-medium text-foreground/80">Convenio:</span>{" "}
                                  <span className="font-semibold">{supplier.bank_agreement.trim()}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 flex items-center justify-center gap-2">
                          <Landmark className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
                          <span className="text-xs font-medium text-muted-foreground">Sin datos bancarios</span>
                        </div>
                      )}
                      {supplier.phone ? (
                        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 p-3 shadow-sm flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Phone className="size-4" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Teléfono</p>
                            <p className="text-sm font-bold tabular-nums tracking-wide truncate">{supplier.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 flex items-center gap-2">
                          <Phone className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                          <span className="text-xs font-medium text-muted-foreground">Sin teléfono</span>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>

                  <footer
                    className="border-t border-border p-2.5 flex flex-wrap items-center justify-end gap-1.5 bg-muted/40 rounded-b-2xl shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs font-semibold"
                      onClick={(e) => handleEdit(supplier, e)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Eliminar proveedor"
                      onClick={(e) => openDeleteDialog(supplier, e)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </footer>
                </motion.div>
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

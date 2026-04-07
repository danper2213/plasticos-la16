/** Tipos compartidos (sin `"use server"`) para evitar que client components importen el módulo de actions. */

export interface Supplier {
  id: string;
  name: string;
  tax_id: string | null;
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  bank_agreement: string | null;
  phone: string | null;
  show_on_website: boolean;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierBankInfo {
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  bank_agreement: string | null;
}

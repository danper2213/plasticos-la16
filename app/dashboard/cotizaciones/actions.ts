"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/utils/supabase/require-user";
import { queryActiveProductsWithSearch } from "@/lib/query-active-products";
import { productAutocompleteSearchFields } from "@/lib/supabase-search-filter";
import { fetchQuoteDetail } from "./quote-queries";
import { saveQuoteSchema } from "./schema";
import type { ProductQuoteSearchHit, QuoteDetail, QuoteLineRow, QuoteListItem } from "./quote-types";

const quoteIdSchema = z.string().uuid();

export async function searchProductsForQuote(query: string): Promise<ProductQuoteSearchHit[]> {
  const { supabase } = await requireUser();
  return queryActiveProductsWithSearch(supabase, query, {
    select: `
      id,
      name,
      presentation,
      packaging,
      cost,
      product_categories ( name )
    `,
    limit: 25,
    resolveFields: productAutocompleteSearchFields,
    mapRow: (row) => {
      const cat = row.product_categories as
        | { name?: string }
        | { name?: string }[]
        | null
        | undefined;
      const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
      return {
        id: row.id as string,
        name: row.name as string,
        presentation: (row.presentation as string) ?? "",
        cost: Number(row.cost ?? 0),
        category_name: categoryName ?? null,
      };
    },
  });
}

export async function getRecentQuotes(): Promise<QuoteListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, customer_name, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("getRecentQuotes error:", error);
    return [];
  }

  return (data ?? []) as QuoteListItem[];
}

export async function getQuoteById(id: string): Promise<QuoteDetail | null> {
  const { supabase } = await requireUser();
  return fetchQuoteDetail(supabase, id);
}

export async function deleteQuote(id: string) {
  const parsed = quoteIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false as const, error: "Identificador de cotización no válido" };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quotes").delete().eq("id", parsed.data);
  if (error) {
    return { success: false as const, error: error.message };
  }
  revalidatePath("/dashboard/cotizaciones");
  return { success: true as const };
}

export async function saveQuote(input: unknown) {
  const parsed = saveQuoteSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" · ");
    return { success: false as const, error: msg || "Datos no válidos" };
  }

  const data = parsed.data;
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();

  const quoteRow = {
    customer_id: data.customer_id ?? null,
    customer_name: data.customer_name.trim(),
    notes: data.notes?.trim() || null,
    valid_until: data.valid_until?.trim() || null,
    default_utility_percent: data.default_utility_percent,
    updated_at: now,
  };

  let quoteId = data.id;

  if (quoteId) {
    const { error: uErr } = await supabase.from("quotes").update(quoteRow).eq("id", quoteId);
    if (uErr) {
      return { success: false as const, error: uErr.message };
    }
    const { error: dErr } = await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    if (dErr) {
      return { success: false as const, error: dErr.message };
    }
  } else {
    const { data: inserted, error: iErr } = await supabase
      .from("quotes")
      .insert({
        ...quoteRow,
        created_by_user_id: user.id,
      })
      .select("id")
      .single();

    if (iErr || !inserted?.id) {
      return { success: false as const, error: iErr?.message ?? "No se pudo crear la cotización" };
    }
    quoteId = inserted.id as string;
  }

  const lineRows = data.lines.map((line, index) => ({
    quote_id: quoteId,
    sort_order: index,
    product_id: line.product_id ?? null,
    product_name: line.product_name.trim(),
    presentation: line.presentation.trim(),
    quantity: line.quantity,
    unit_cost: line.unit_cost,
    list_unit_price: line.list_unit_price,
  }));

  const { error: lErr } = await supabase.from("quote_lines").insert(lineRows);
  if (lErr) {
    return { success: false as const, error: lErr.message };
  }

  revalidatePath("/dashboard/cotizaciones");
  return { success: true as const, id: quoteId };
}

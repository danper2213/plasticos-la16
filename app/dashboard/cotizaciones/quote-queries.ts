import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteDetail, QuoteLineRow } from "./quote-types";

export async function fetchQuoteDetail(supabase: SupabaseClient, id: string): Promise<QuoteDetail | null> {
  const { data: quote, error: qErr } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();

  if (qErr || !quote) {
    if (qErr) console.error("fetchQuoteDetail quote error:", qErr);
    return null;
  }

  const { data: linesRaw, error: lErr } = await supabase
    .from("quote_lines")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });

  if (lErr) {
    console.error("fetchQuoteDetail lines error:", lErr);
    return null;
  }

  const lines: QuoteLineRow[] = (linesRaw ?? []).map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id),
      quote_id: String(r.quote_id),
      sort_order: Number(r.sort_order ?? 0),
      product_id: (r.product_id as string | null) ?? null,
      product_name: String(r.product_name ?? ""),
      presentation: String(r.presentation ?? ""),
      quantity: Number(r.quantity ?? 0),
      unit_cost: Number(r.unit_cost ?? 0),
      list_unit_price: Number(r.list_unit_price ?? 0),
    };
  });

  const q = quote as unknown as Record<string, unknown>;
  return {
    id: q.id as string,
    customer_id: (q.customer_id as string | null) ?? null,
    customer_name: String(q.customer_name ?? ""),
    notes: (q.notes as string | null) ?? null,
    valid_until: q.valid_until ? String(q.valid_until).slice(0, 10) : null,
    default_utility_percent: Number(q.default_utility_percent ?? 20),
    created_at: String(q.created_at ?? ""),
    lines,
  };
}

export interface ProductQuoteSearchHit {
  id: string;
  name: string;
  presentation: string;
  cost: number;
  category_name: string | null;
}

export interface QuoteListItem {
  id: string;
  customer_name: string;
  created_at: string;
}

export interface QuoteLineRow {
  id: string;
  quote_id: string;
  sort_order: number;
  product_id: string | null;
  product_name: string;
  presentation: string;
  quantity: number;
  unit_cost: number;
  list_unit_price: number;
}

export interface QuoteDetail {
  id: string;
  customer_id: string | null;
  customer_name: string;
  notes: string | null;
  valid_until: string | null;
  default_utility_percent: number;
  created_at: string;
  lines: QuoteLineRow[];
}

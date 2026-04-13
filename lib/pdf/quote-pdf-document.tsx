import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { quoteLineTotal } from "@/lib/quotes/pricing";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 16, fontFamily: "Helvetica-Bold" },
  meta: { marginBottom: 8, color: "#333" },
  table: { marginTop: 16 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 6 },
  head: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  colProduct: { width: "42%" },
  colCost: { width: "14%", textAlign: "right" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "17%", textAlign: "right" },
  colTotal: { width: "17%", textAlign: "right" },
  totals: { marginTop: 20, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalLabel: { width: 120, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalValue: { width: 80, textAlign: "right" },
  notes: { marginTop: 20, fontSize: 9, color: "#444" },
});

export interface QuotePdfLine {
  product_name: string;
  presentation: string;
  quantity: number;
  unit_cost: number;
  list_unit_price: number;
}

export interface QuotePdfProps {
  customerName: string;
  notes: string | null;
  validUntil: string | null;
  createdAtLabel: string;
  /** Utilidad por defecto usada al armar ítems (referencia). */
  defaultUtilityPercent: number;
  lines: QuotePdfLine[];
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function QuotePdfDocument({
  customerName,
  notes,
  validUntil,
  createdAtLabel,
  defaultUtilityPercent,
  lines,
}: QuotePdfProps) {
  let grand = 0;
  const rows = lines.map((l) => {
    const sub = quoteLineTotal(l.list_unit_price, l.quantity);
    grand += sub;
    return { l, sub };
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cotización — PLASTICOS LA 16</Text>
        <Text style={styles.meta}>Cliente: {customerName}</Text>
        <Text style={styles.meta}>Fecha: {createdAtLabel}</Text>
        {validUntil ? <Text style={styles.meta}>Válida hasta: {validUntil}</Text> : null}
        <Text style={styles.meta}>Utilidad de referencia (nuevos ítems): {defaultUtilityPercent}%</Text>

        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={styles.colProduct}>Producto</Text>
            <Text style={styles.colCost}>Costo u.</Text>
            <Text style={styles.colQty}>Cant.</Text>
            <Text style={styles.colUnit}>P. unit.</Text>
            <Text style={styles.colTotal}>Subtotal</Text>
          </View>
          {rows.map(({ l, sub }, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.colProduct}>
                {l.product_name}
                {l.presentation ? `\n${l.presentation}` : ""}
              </Text>
              <Text style={styles.colCost}>{formatMoney(l.unit_cost)}</Text>
              <Text style={styles.colQty}>{String(l.quantity)}</Text>
              <Text style={styles.colUnit}>{formatMoney(l.list_unit_price)}</Text>
              <Text style={styles.colTotal}>{formatMoney(sub)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(grand)}</Text>
          </View>
        </View>

        {notes?.trim() ? (
          <View style={styles.notes}>
            <Text>Notas: {notes.trim()}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

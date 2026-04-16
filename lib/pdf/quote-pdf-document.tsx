import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { quoteLineTotal } from "@/lib/quotes/pricing";

const palette = {
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  rowAlt: "#f8fafc",
  accent: "#1e3a5f",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: palette.ink,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: palette.accent,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  brandBlock: { maxWidth: "58%" },
  brandName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: palette.accent,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 8,
    color: palette.muted,
    letterSpacing: 0.15,
  },
  docBlock: { alignItems: "flex-end" },
  docKind: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.2,
    color: palette.muted,
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: palette.ink,
    marginBottom: 4,
  },
  docMeta: { fontSize: 8.5, color: palette.muted, marginTop: 2 },
  clientCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: "#fafbfc",
  },
  clientLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    color: palette.muted,
    marginBottom: 6,
  },
  clientName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: palette.ink },
  clientMeta: { fontSize: 8.5, color: palette.muted, marginTop: 4 },
  tableWrap: { marginTop: 4 },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: palette.accent,
  },
  thProduct: { width: "48%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  thQty: { width: "14%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" },
  thUnit: { width: "19%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" },
  thSub: { width: "19%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" },
  row: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.border,
  },
  rowAlt: { backgroundColor: palette.rowAlt },
  tdProduct: { width: "48%", fontSize: 9, paddingRight: 6 },
  tdProductSub: { fontSize: 8, color: palette.muted, marginTop: 3 },
  tdQty: { width: "14%", fontSize: 9, textAlign: "right" },
  tdUnit: { width: "19%", fontSize: 9, textAlign: "right" },
  tdSub: { width: "19%", fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalsBox: {
    marginTop: 18,
    alignSelf: "flex-end",
    minWidth: 200,
    borderTopWidth: 2,
    borderTopColor: palette.accent,
    paddingTop: 10,
  },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "baseline" },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: palette.muted,
    marginRight: 14,
    letterSpacing: 0.5,
  },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: palette.accent },
  notesBlock: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: palette.border,
  },
  notesLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: palette.muted,
    marginBottom: 5,
  },
  notesText: { fontSize: 8.5, color: palette.ink, lineHeight: 1.45 },
  footer: {
    marginTop: 28,
    borderTopWidth: 0.5,
    borderTopColor: palette.border,
    paddingTop: 10,
  },
  footerText: { fontSize: 7.5, color: palette.muted, textAlign: "center", lineHeight: 1.35 },
});

export interface QuotePdfLine {
  product_name: string;
  presentation: string;
  quantity: number;
  list_unit_price: number;
}

export interface QuotePdfProps {
  /** Primeros caracteres del UUID para referencia en el documento */
  quoteRef: string;
  customerName: string;
  notes: string | null;
  validUntil: string | null;
  createdAtLabel: string;
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
  quoteRef,
  customerName,
  notes,
  validUntil,
  createdAtLabel,
  lines,
}: QuotePdfProps) {
  let grand = 0;
  const rows = lines.map((l) => {
    const sub = quoteLineTotal(l.list_unit_price, l.quantity);
    grand += sub;
    return { l, sub };
  });

  const validityLine = validUntil
    ? `Propuesta válida hasta el ${validUntil}. Los valores pueden ajustarse según disponibilidad y condiciones acordadas.`
    : "Los valores y plazos se confirman al aceptar la propuesta comercial.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>PLÁSTICOS LA 16</Text>
            <Text style={styles.brandTagline}>Soluciones en plástico · Cotización comercial</Text>
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docKind}>DOCUMENTO</Text>
            <Text style={styles.docTitle}>Cotización</Text>
            <Text style={styles.docMeta}>Ref. {quoteRef}</Text>
            <Text style={styles.docMeta}>Emisión: {createdAtLabel}</Text>
          </View>
        </View>

        <View style={styles.clientCard}>
          <Text style={styles.clientLabel}>DIRIGIDO A</Text>
          <Text style={styles.clientName}>{customerName || "Cliente"}</Text>
          {validUntil ? <Text style={styles.clientMeta}>Válida hasta: {validUntil}</Text> : null}
        </View>

        <View style={styles.tableWrap}>
          <View style={styles.tableHead}>
            <Text style={styles.thProduct}>Descripción</Text>
            <Text style={styles.thQty}>Cant.</Text>
            <Text style={styles.thUnit}>V. unitario</Text>
            <Text style={styles.thSub}>Subtotal</Text>
          </View>
          {rows.map(({ l, sub }, idx) => (
            <View key={idx} wrap={false} style={idx % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
              <View style={styles.tdProduct}>
                <Text>{l.product_name}</Text>
                {l.presentation ? <Text style={styles.tdProductSub}>{l.presentation}</Text> : null}
              </View>
              <Text style={styles.tdQty}>{String(l.quantity)}</Text>
              <Text style={styles.tdUnit}>{formatMoney(l.list_unit_price)}</Text>
              <Text style={styles.tdSub}>{formatMoney(sub)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatMoney(grand)}</Text>
          </View>
        </View>

        {notes?.trim() ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>OBSERVACIONES</Text>
            <Text style={styles.notesText}>{notes.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {validityLine}
            {"\n"}
            Documento informativo. PLÁSTICOS LA 16 — Gracias por su confianza.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

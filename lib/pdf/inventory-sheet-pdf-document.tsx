import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const palette = {
  ink: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  rowAlt: "#f8fafc",
  accent: "#1e3a5f",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 36,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  brandName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: palette.accent,
    letterSpacing: 0.4,
  },
  brandTag: { fontSize: 8, color: palette.muted, marginTop: 3 },
  codeBox: {
    borderWidth: 1.5,
    borderColor: palette.accent,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "flex-end",
  },
  codeLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: palette.muted,
  },
  codeValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  checkBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 110,
    marginRight: 10,
  },
  square: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: palette.ink,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  squareMark: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  dateBox: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    marginLeft: 2,
  },
  dateLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: palette.muted,
  },
  dateLine: { fontSize: 10, marginTop: 4, color: palette.muted },
  formatName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: palette.accent,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  thNum: { width: "8%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  thQty: { width: "22%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  thProd: { width: "70%", color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  row: {
    flexDirection: "row",
    minHeight: 28,
    borderBottomWidth: 0.8,
    borderBottomColor: palette.border,
    alignItems: "stretch",
  },
  rowAlt: { backgroundColor: palette.rowAlt },
  tdNum: {
    width: "8%",
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tdQty: {
    width: "22%",
    borderLeftWidth: 0.8,
    borderRightWidth: 0.8,
    borderColor: palette.border,
  },
  tdProd: { width: "70%", paddingVertical: 6, paddingHorizontal: 8 },
  prodName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  prodSub: { fontSize: 8, color: palette.muted, marginTop: 2 },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: palette.border,
  },
  footerText: { fontSize: 8, color: palette.muted, lineHeight: 1.4 },
});

export type InventorySheetPdfLine = {
  name: string;
  presentation: string | null;
  packaging: string | null;
};

export type InventorySheetPdfProps = {
  code: string;
  formatName: string;
  defaultMovementType: "in" | "out" | null;
  notes: string | null;
  lines: InventorySheetPdfLine[];
};

function CheckCell({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={styles.checkBox}>
      <View style={styles.square}>
        {checked ? <Text style={styles.squareMark}>X</Text> : null}
      </View>
      <Text>{label}</Text>
    </View>
  );
}

export function InventorySheetPdfDocument({
  code,
  formatName,
  defaultMovementType,
  notes,
  lines,
}: InventorySheetPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>PLÁSTICOS LA 16</Text>
            <Text style={styles.brandTag}>Hoja de inventario · anotar cantidades a mano</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>CÓDIGO</Text>
            <Text style={styles.codeValue}>{code}</Text>
          </View>
        </View>

        <Text style={styles.formatName}>{formatName}</Text>

        <View style={styles.metaRow}>
          <CheckCell label="Entrada" checked={defaultMovementType === "in"} />
          <CheckCell label="Salida" checked={defaultMovementType === "out"} />
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>FECHA</Text>
            <Text style={styles.dateLine}>______ / ______ / __________</Text>
          </View>
        </View>

        <View style={styles.tableHead} fixed>
          <Text style={styles.thNum}>#</Text>
          <Text style={styles.thQty}>Cantidad</Text>
          <Text style={styles.thProd}>Producto</Text>
        </View>

        {lines.map((line, idx) => {
          const sub = [line.presentation, line.packaging].filter(Boolean).join(" · ");
          return (
            <View
              key={idx}
              wrap={false}
              style={idx % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            >
              <Text style={styles.tdNum}>{String(idx + 1)}</Text>
              <View style={styles.tdQty} />
              <View style={styles.tdProd}>
                <Text style={styles.prodName}>{line.name}</Text>
                {sub ? <Text style={styles.prodSub}>{sub}</Text> : null}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Anotá la cantidad en la columna vacía. Escribí 0 o NO HAY si ese producto no entra ni
            sale. Después fotografiá la hoja para cargarla en el sistema.
            {notes?.trim() ? `\n${notes.trim()}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

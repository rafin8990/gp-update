import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ILocationTracker } from "@/lib/api/location-trackers";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  logo: { height: 32, width: 160, objectFit: "contain" },
  logoSmall: { height: 20, width: 100, objectFit: "contain" },
  logoFallback: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#373B44" },
  titleBlock: { flex: 1 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  epc: { fontSize: 7, fontFamily: "Helvetica", color: "#444", marginBottom: 2 },
  subtitle: { fontSize: 7, color: "#666" },
  summaryBox: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 2,
  },
  summaryLine: { fontSize: 7, marginBottom: 2 },
  summaryBold: { fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 4,
    fontSize: 6.5,
  },
  cStep: { width: "7%" },
  cWhen: { width: "20%" },
  cLoc: { width: "28%" },
  cPo: { width: "15%" },
  cSt: { width: "10%" },
  cQty: { width: "8%", textAlign: "right" },
  text: { fontSize: 6.5 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
  },
});

const ROWS_PER_PAGE = 22;

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}\n${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })}`;
}

export function LocationTrackerLifecyclePdfDocument({
  epc,
  rows,
  logoPngDataUrl,
  generatedAtLabel,
}: {
  epc: string;
  rows: ILocationTracker[];
  logoPngDataUrl: string | null;
  generatedAtLabel: string;
}) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const pages: ILocationTracker[][] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <Document title={`RFID lifecycle — ${epc.slice(0, 40)}`} author="GP Warehouse">
      {pages.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page} wrap>
          {pageIndex === 0 ? (
            <>
              <View style={styles.headerRow}>
                {logoPngDataUrl ? (
                  <Image src={logoPngDataUrl} style={styles.logo} />
                ) : (
                  <Text style={styles.logoFallback}>Assetiq</Text>
                )}
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>RFID lifecycle report</Text>
                  <Text style={styles.epc}>{epc}</Text>
                  <Text style={styles.subtitle}>Generated: {generatedAtLabel}</Text>
                </View>
              </View>
              {first && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.summaryBold}>Item: </Text>
                    {first.item_number}
                    {first.item_description ? ` — ${first.item_description.slice(0, 120)}` : ""}
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.summaryBold}>PO: </Text>
                    {first.po_number}
                  </Text>
                  <Text style={styles.summaryLine}>
                    <Text style={styles.summaryBold}>Reads in export: </Text>
                    {rows.length}
                    {last ? ` · Last movement: ${last.status.toUpperCase()}` : ""}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.headerRow, { marginBottom: 8 }]}>
              {logoPngDataUrl ? (
                <Image src={logoPngDataUrl} style={styles.logoSmall} />
              ) : (
                <Text style={[styles.logoFallback, { fontSize: 10 }]}>Assetiq</Text>
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.subtitle}>
                  RFID lifecycle (continued) — page {pageIndex + 1}
                </Text>
                <Text style={styles.epc}>{epc.slice(0, 80)}</Text>
              </View>
            </View>
          )}

          <View style={styles.tableHeader}>
            <Text style={[styles.text, styles.cStep]}>#</Text>
            <Text style={[styles.text, styles.cWhen]}>Date / time</Text>
            <Text style={[styles.text, styles.cLoc]}>Location</Text>
            <Text style={[styles.text, styles.cPo]}>PO</Text>
            <Text style={[styles.text, styles.cSt]}>IN/OUT</Text>
            <Text style={[styles.text, styles.cQty]}>Qty</Text>
          </View>

          {chunk.length === 0 && pageIndex === 0 ? (
            <Text style={styles.text}>No timeline rows.</Text>
          ) : (
            chunk.map((row, idx) => {
              const stepNum = pageIndex * ROWS_PER_PAGE + idx + 1;
              return (
                <View key={row.id} style={styles.row} wrap={false}>
                  <Text style={[styles.text, styles.cStep]}>{stepNum}</Text>
                  <Text style={[styles.text, styles.cWhen]}>{formatWhen(row.created_at)}</Text>
                  <Text style={[styles.text, styles.cLoc]}>
                    {(row.location_name || "—") + "\n"}
                    <Text style={{ color: "#555" }}>{row.location_code || "—"}</Text>
                  </Text>
                  <Text style={[styles.text, styles.cPo]}>{row.po_number}</Text>
                  <Text style={[styles.text, styles.cSt]}>{row.status.toUpperCase()}</Text>
                  <Text style={[styles.text, styles.cQty]}>{String(row.quantity)}</Text>
                </View>
              );
            })
          )}

          <Text style={styles.footer}>
            {`Page ${pageIndex + 1} of ${pages.length} · EPC lifecycle · ${rows.length} step(s)`}
          </Text>
        </Page>
      ))}
    </Document>
  );
}

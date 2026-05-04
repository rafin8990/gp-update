import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ILocationTracker } from "@/lib/api/location-trackers";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 7,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 14,
  },
  logo: {
    height: 36,
    width: 180,
    objectFit: "contain",
  },
  logoSmall: {
    height: 22,
    width: 110,
    objectFit: "contain",
  },
  logoFallback: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#373B44",
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 8, color: "#444", marginBottom: 10 },
  filterBlock: {
    fontSize: 7,
    marginBottom: 10,
    padding: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 2,
  },
  filterLine: { marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 3,
    minHeight: 14,
  },
  cellDt: { width: "11%" },
  cellEpc: { width: "22%" },
  cellItem: { width: "18%" },
  cellLoc: { width: "18%" },
  cellPo: { width: "11%" },
  cellSt: { width: "7%" },
  cellQty: { width: "7%", textAlign: "right" },
  text: { fontSize: 6.5 },
  textBold: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
  },
});

const ROWS_PER_PAGE = 28;

function formatRowDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${date}\n${time}`;
}

export type LocationTrackerPdfFilterNotes = {
  lines: string[];
  scopeLabel: string;
};

export function LocationTrackerReportPdfDocument({
  rows,
  filterNotes,
  generatedAtLabel,
  logoPngDataUrl,
}: {
  rows: ILocationTracker[];
  filterNotes: LocationTrackerPdfFilterNotes;
  generatedAtLabel: string;
  /** Rasterized Assetiq logo (PNG data URL), or null to show text fallback */
  logoPngDataUrl: string | null;
}) {
  const pages: ILocationTracker[][] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <Document title="Location tracker report" author="GP Warehouse">
      {pages.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page} wrap>
          {pageIndex === 0 && (
            <>
              <View style={styles.headerRow}>
                {logoPngDataUrl ? (
                  <Image src={logoPngDataUrl} style={styles.logo} />
                ) : (
                  <Text style={styles.logoFallback}>Assetiq</Text>
                )}
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>Location tracker report</Text>
                  <Text style={styles.subtitle}>Generated: {generatedAtLabel}</Text>
                </View>
              </View>
              <View style={styles.filterBlock}>
                <Text style={[styles.textBold, { marginBottom: 4 }]}>
                  {filterNotes.scopeLabel}
                </Text>
                {filterNotes.lines.map((line, i) => (
                  <Text key={i} style={styles.filterLine}>
                    • {line}
                  </Text>
                ))}
              </View>
            </>
          )}
          {pageIndex > 0 && (
            <View style={[styles.headerRow, { marginBottom: 8 }]}>
              {logoPngDataUrl ? (
                <Image src={logoPngDataUrl} style={styles.logoSmall} />
              ) : (
                <Text style={[styles.logoFallback, { fontSize: 11 }]}>Assetiq</Text>
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.subtitle}>
                  Location tracker report (continued) — page {pageIndex + 1}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tableHeader}>
            <Text style={[styles.textBold, styles.cellDt]}>Date / time</Text>
            <Text style={[styles.textBold, styles.cellEpc]}>RFID (EPC)</Text>
            <Text style={[styles.textBold, styles.cellItem]}>Item</Text>
            <Text style={[styles.textBold, styles.cellLoc]}>Location</Text>
            <Text style={[styles.textBold, styles.cellPo]}>PO</Text>
            <Text style={[styles.textBold, styles.cellSt]}>IN/OUT</Text>
            <Text style={[styles.textBold, styles.cellQty]}>Qty</Text>
          </View>

          {chunk.length === 0 && pageIndex === 0 ? (
            <Text style={styles.text}>No records in this export.</Text>
          ) : (
            chunk.map(row => (
              <View key={row.id} style={styles.row} wrap={false}>
                <View style={styles.cellDt}>
                  <Text style={styles.text}>{formatRowDateTime(row.created_at)}</Text>
                </View>
                <View style={styles.cellEpc}>
                  <Text style={styles.text}>{row.epc?.trim() || "—"}</Text>
                </View>
                <View style={styles.cellItem}>
                  <Text style={styles.text}>{row.item_number}</Text>
                  {row.item_description ? (
                    <Text style={[styles.text, { color: "#555" }]}>
                      {row.item_description.slice(0, 80)}
                      {(row.item_description?.length ?? 0) > 80 ? "…" : ""}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cellLoc}>
                  <Text style={styles.text}>{row.location_name || "—"}</Text>
                  <Text style={[styles.text, { color: "#555" }]}>
                    {row.location_code || "—"}
                  </Text>
                </View>
                <View style={styles.cellPo}>
                  <Text style={styles.text}>{row.po_number}</Text>
                </View>
                <View style={styles.cellSt}>
                  <Text style={styles.text}>{row.status.toUpperCase()}</Text>
                </View>
                <View style={styles.cellQty}>
                  <Text style={styles.text}>{String(row.quantity)}</Text>
                </View>
              </View>
            ))
          )}

          <Text style={styles.footer}>{`Page ${pageIndex + 1} of ${pages.length} · Total rows: ${rows.length}`}</Text>
        </Page>
      ))}
    </Document>
  );
}

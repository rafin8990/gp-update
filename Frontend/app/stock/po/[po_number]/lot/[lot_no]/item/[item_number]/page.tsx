"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Hash, Package, Radio } from "lucide-react";
import { stockApi, IStock, IStockInboundScanRow } from "@/lib/api/stock";
import { stockPoLotPath } from "@/lib/stockPaths";
import { useToast } from "@/hooks/use-toast";

function formatSerialRange(start: string | null, end: string | null): string {
  if (start == null && end == null) return "—";
  if (start != null && end != null) {
    if (start === end) return start;
    return `${start} – ${end}`;
  }
  return start ?? end ?? "—";
}

function serialGroupKey(r: IStockInboundScanRow): string {
  if (r.serial_start != null || r.serial_end != null) {
    return `${r.serial_start ?? ""}\u0000${r.serial_end ?? ""}`;
  }
  return "__no_serial__";
}

export default function StockPoLotItemDetailPage() {
  const params = useParams<{ po_number: string; lot_no: string; item_number: string }>();
  const poNumber = decodeURIComponent(params.po_number ?? "");
  const lotNo = decodeURIComponent(params.lot_no ?? "");
  const itemNumber = decodeURIComponent(params.item_number ?? "");
  const { toast } = useToast();

  const [stock, setStock] = useState<IStock | null | undefined>(undefined);
  const [scans, setScans] = useState<IStockInboundScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!poNumber || !lotNo || !itemNumber) {
        setLoading(false);
        setStock(null);
        return;
      }
      try {
        setLoading(true);
        const [stockRes, scansRes] = await Promise.all([
          stockApi.getStockByPoItemLot(poNumber, itemNumber, lotNo),
          stockApi.getInboundScansForStockLine(poNumber, itemNumber, lotNo),
        ]);
        if (cancelled) return;
        setStock(stockRes.data ?? null);
        setScans(scansRes.data ?? []);
      } catch {
        if (!cancelled) {
          toast({
            title: "Error",
            description: "Failed to load stock or inbound RFID lines",
            variant: "destructive",
          });
          setStock(null);
          setScans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poNumber, lotNo, itemNumber, toast]);

  const rangeSummaries = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of scans) {
      const label = formatSerialRange(r.serial_start, r.serial_end);
      if (label === "—") continue;
      const prev = map.get(label);
      map.set(label, { label, count: (prev?.count ?? 0) + 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [scans]);

  const serialGroups = useMemo(() => {
    const m = new Map<string, IStockInboundScanRow[]>();
    for (const r of scans) {
      const k = serialGroupKey(r);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    }
    const order = (a: string, b: string) => {
      if (a === "__no_serial__") return 1;
      if (b === "__no_serial__") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    };
    return Array.from(m.entries()).sort(([ka], [kb]) => order(ka, kb));
  }, [scans]);

  return (
    <PageLayout activePage="stock">
      <div className="space-y-6">
        <PageHeader
          title={`RFID & serial — ${itemNumber}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stock", href: "/stock" },
            { label: `${poNumber} · ${lotNo}`, href: stockPoLotPath(poNumber, lotNo) },
            { label: itemNumber, href: "#" },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={stockPoLotPath(poNumber, lotNo)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              PO / lot items
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/stock">All stock</Link>
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : stock == null ? (
          <Card>
            <CardHeader>
              <CardTitle>Not found</CardTitle>
              <CardDescription>
                No stock row for PO <span className="font-mono">{poNumber}</span>, item{" "}
                <span className="font-mono">{itemNumber}</span>, lot{" "}
                <span className="font-mono">{lotNo}</span>.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Stock line
                </CardTitle>
                <CardDescription>PO, lot, and quantity for this ERP item.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">PO</span>
                  <p className="font-mono font-medium">{stock.po_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lot</span>
                  <p className="font-mono font-medium">{stock.lot_no}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Item</span>
                  <p className="font-mono font-medium">{stock.item_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity</span>
                  <p className="font-semibold text-lg text-green-700">{stock.quantity.toLocaleString()}</p>
                </div>
                {stock.item_description && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Description</span>
                    <p>{stock.item_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {rangeSummaries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Serial ranges (summary)
                  </CardTitle>
                  <CardDescription>
                    Distinct serial ranges on inbound scans for this line; numbers below are scan line counts,
                    not serial span length.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-wrap gap-2">
                    {rangeSummaries.map((s) => (
                      <li
                        key={s.label}
                        className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-mono"
                      >
                        {s.label}
                        <span className="ml-2 text-muted-foreground">({s.count} lines)</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Inbound RFID (EPC) lines
                </CardTitle>
                <CardDescription>
                  Rows come from gate scans linked to <span className="font-mono">po_codes</span> for this PO
                  and item; lot is matched to <span className="font-mono">stock.lot_number</span>. If nothing
                  has been scanned yet, issued tags still show from <span className="font-mono">po_codes</span>{" "}
                  (same RFID and serial range).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {scans.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No RFID lines for this PO, item, and lot. Ensure <span className="font-mono">po_codes</span>{" "}
                    exists for this PO and item, and stock exists for this lot.
                  </p>
                ) : (
                  serialGroups.map(([key, groupRows]) => {
                    const first = groupRows[0];
                    const rangeLabel =
                      key === "__no_serial__"
                        ? "RFID only (no serial range)"
                        : `Serial range: ${formatSerialRange(first.serial_start, first.serial_end)}`;
                    return (
                      <div key={key} className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground border-b pb-1">{rangeLabel}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>EPC (RFID)</TableHead>
                              <TableHead>Serial range</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Scanned at</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupRows.map((r) => (
                              <TableRow key={`${r.row_source ?? "inbound_scan"}-${r.id}`}>
                                <TableCell className="font-mono text-xs max-w-[220px] break-all">
                                  {r.epc}
                                  {r.row_source === "po_code" && (
                                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      PO code
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {formatSerialRange(r.serial_start, r.serial_end)}
                                </TableCell>
                                <TableCell className="text-right">{r.quantity.toLocaleString()}</TableCell>
                                <TableCell>
                                  {r.row_source === "po_code" ? (
                                    <span className="text-muted-foreground text-sm">Not gate-scanned</span>
                                  ) : (
                                    <span
                                      className={
                                        r.status === "in" ? "text-green-700 font-medium" : "text-red-700 font-medium"
                                      }
                                    >
                                      {r.status.toUpperCase()}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.location_name ?? "—"}
                                  {r.location_code && (
                                    <span className="block text-xs text-muted-foreground font-mono">
                                      {r.location_code}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {r.row_source === "po_code" ? (
                                    <span title="Time from po_codes record">{new Date(r.scanned_at).toLocaleString()}</span>
                                  ) : (
                                    new Date(r.scanned_at).toLocaleString()
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, Radio } from "lucide-react";
import { stockApi, IStock } from "@/lib/api/stock";
import { stockPoLotItemPath } from "@/lib/stockPaths";
import { useToast } from "@/hooks/use-toast";

export default function StockPoLotPage() {
  const params = useParams<{ po_number: string; lot_no: string }>();
  const poNumber = decodeURIComponent(params.po_number ?? "");
  const lotNo = decodeURIComponent(params.lot_no ?? "");
  const { toast } = useToast();

  const [rows, setRows] = useState<IStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!poNumber || !lotNo) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await stockApi.getStocks({ po_number: poNumber, lot_no: lotNo });
        if (cancelled) return;
        const exact = (res.data ?? []).filter(
          (s) => s.po_number === poNumber && s.lot_no === lotNo,
        );
        setRows(exact);
      } catch {
        if (!cancelled) {
          toast({
            title: "Error",
            description: "Failed to load stock for this PO and lot",
            variant: "destructive",
          });
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poNumber, lotNo, toast]);

  const totalQty = useMemo(() => rows.reduce((acc, r) => acc + (r.quantity ?? 0), 0), [rows]);

  return (
    <PageLayout activePage="stock">
      <div className="space-y-6">
        <PageHeader
          title={`Stock — ${poNumber} / Lot ${lotNo}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stock", href: "/stock" },
            { label: `${poNumber} · ${lotNo}`, href: "#" },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/stock">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to stock
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items in this PO and lot
            </CardTitle>
            <CardDescription>
              Open an item to see RFID (EPC) lines and serial number ranges from inbound scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No stock rows found for this PO and lot.
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Combined quantity on this lot:{" "}
                  <span className="font-semibold text-foreground">{totalQty.toLocaleString()}</span>
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="w-[180px]">RFID / serial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-medium">{r.item_number}</TableCell>
                        <TableCell className="max-w-md truncate" title={r.item_description}>
                          {r.item_description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {r.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={stockPoLotItemPath(poNumber, lotNo, r.item_number)}>
                              <Radio className="h-4 w-4 mr-1" />
                              Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

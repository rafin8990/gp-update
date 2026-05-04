"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileDown, ListTree, MapPin, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { locationTrackersApi, ILocationTracker } from "@/lib/api/location-trackers";
import { getAssetiqLogoPngDataUrl } from "@/lib/assetiq-logo-pdf";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function LocationTrackerEpcLifecyclePage() {
  const params = useParams();
  const raw = params?.epc;
  const epc = typeof raw === "string" ? decodeURIComponent(raw) : "";
  const { toast } = useToast();
  const [rows, setRows] = useState<ILocationTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!epc.trim()) {
      setLoading(false);
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await locationTrackersApi.getLocationTrackers({
          epc: epc.trim(),
          limit: 100,
          page: 1,
          sortBy: "created_at",
          sortOrder: "asc",
        });
        if (cancelled) return;
        setRows(res.data);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast({
            title: "Failed to load lifecycle",
            description: e instanceof Error ? e.message : "Unexpected error",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [epc, toast]);

  const summary = useMemo(() => {
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (!first) return null;
    return {
      item_number: first.item_number,
      item_description: first.item_description,
      po_number: first.po_number,
      firstAt: first.created_at,
      lastAt: last?.created_at,
      reads: rows.length,
      lastStatus: last?.status,
    };
  }, [rows]);

  const handlePrintPdf = async () => {
    if (!epc.trim() || rows.length === 0) return;
    setPdfLoading(true);
    try {
      const [{ pdf }, { LocationTrackerLifecyclePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/location-tracker-status/location-tracker-lifecycle-pdf"),
      ]);
      const logoPngDataUrl = await getAssetiqLogoPngDataUrl();
      const generatedAtLabel = new Date().toLocaleString();
      const blob = await pdf(
        <LocationTrackerLifecyclePdfDocument
          epc={epc.trim()}
          rows={rows}
          logoPngDataUrl={logoPngDataUrl}
          generatedAtLabel={generatedAtLabel}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      const a = document.createElement("a");
      a.href = url;
      a.download = `rfid-lifecycle-${epc.trim().slice(0, 32).replace(/[^\w.-]+/g, "_")}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      toast({
        title: "PDF ready",
        description:
          "Download started; preview may open in a new tab. Print from the viewer (e.g. Ctrl+P).",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "PDF export failed",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  if (!epc.trim()) {
    return (
      <PageLayout activePage="location-tracker-status">
        <div className="space-y-4 p-4">
          <p className="text-muted-foreground">Missing RFID (EPC) in URL.</p>
          <Button variant="outline" asChild>
            <Link href="/location-tracker-status">Back to report</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="location-tracker-status">
      <div className="space-y-6">
        <PageHeader
          title="RFID lifecycle"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Location tracker report", href: "/location-tracker-status" },
            { label: "Lifecycle", href: "#" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/location-tracker-status">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to report
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={pdfLoading || loading || rows.length === 0}
            onClick={() => void handlePrintPdf()}
          >
            <FileDown className="h-4 w-4" />
            {pdfLoading ? "Building PDF…" : "Print / PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTree className="h-5 w-5" />
              Tag identity (EPC)
            </CardTitle>
            <CardDescription>
              One physical RFID tag — all IN/OUT reads we have for this EPC (oldest first, up to
              100 rows).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="break-all rounded-md border bg-muted/40 p-3 font-mono text-sm">
              {epc}
            </div>
            {summary && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{summary.item_number}</span>
                  {summary.item_description && (
                    <span className="text-muted-foreground">— {summary.item_description}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">PO: </span>
                  <span className="font-mono">{summary.po_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reads: </span>
                  <span className="font-medium">{summary.reads}</span>
                </div>
                {summary.lastStatus && (
                  <Badge variant={summary.lastStatus === "in" ? "default" : "secondary"}>
                    Last movement: {summary.lastStatus.toUpperCase()}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Timeline
            </CardTitle>
            <CardDescription>
              Enter (IN) and exit (OUT) per location with date and time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scan history found for this EPC. Try another tag or check spelling.
              </p>
            ) : (
              <ol className="relative ms-2 border-s border-muted-foreground/25 ps-6">
                {rows.map((row, i) => (
                  <li key={row.id} className="mb-8 last:mb-2">
                    <span className="absolute -start-[7px] mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Step {i + 1} · {formatDateTime(row.created_at)}
                        </p>
                        <Badge
                          variant={row.status === "in" ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {row.status === "in" ? (
                            <ArrowRight className="h-3 w-3" />
                          ) : (
                            <ArrowLeft className="h-3 w-3" />
                          )}
                          {row.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-2 text-base font-semibold">
                        {row.location_name || "—"}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({row.location_code || "—"})
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        PO {row.po_number} · Qty {row.quantity}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

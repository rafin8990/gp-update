"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Search, RefreshCw, ArrowRight, ArrowLeft, ListTree, FileDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  locationTrackersApi,
  ILocationTracker,
  ILocationTrackerFilters,
} from "@/lib/api/location-trackers";
import { getAssetiqLogoPngDataUrl } from "@/lib/assetiq-logo-pdf";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

type FormState = {
  searchTerm: string;
  epc: string;
  po_number: string;
  item_number: string;
  location_code: string;
  status: "all" | "in" | "out";
  start_date: string;
  end_date: string;
};

const emptyForm: FormState = {
  searchTerm: "",
  epc: "",
  po_number: "",
  item_number: "",
  location_code: "",
  status: "all",
  start_date: "",
  end_date: "",
};

const PDF_FETCH_PAGE_SIZE = 100;
const PDF_MAX_PAGES = 400;

function mergeTrackerFilters(
  base: ILocationTrackerFilters,
  f: FormState
): ILocationTrackerFilters {
  const next: ILocationTrackerFilters = { ...base };
  const t = f.searchTerm.trim();
  if (t) next.searchTerm = t;
  const epc = f.epc.trim();
  if (epc) next.epc = epc;
  const po = f.po_number.trim();
  if (po) next.po_number = po;
  const item = f.item_number.trim();
  if (item) next.item_number = item;
  const loc = f.location_code.trim();
  if (loc) next.location_code = loc;
  if (f.status !== "all") next.status = f.status;
  if (f.start_date) next.start_date = new Date(f.start_date).toISOString();
  if (f.end_date) next.end_date = new Date(f.end_date).toISOString();
  return next;
}

function hasActiveFilters(c: FormState): boolean {
  return (
    c.searchTerm.trim() !== "" ||
    c.epc.trim() !== "" ||
    c.po_number.trim() !== "" ||
    c.item_number.trim() !== "" ||
    c.location_code.trim() !== "" ||
    c.status !== "all" ||
    c.start_date !== "" ||
    c.end_date !== ""
  );
}

async function fetchAllRowsForPdf(committed: FormState): Promise<ILocationTracker[]> {
  const combined: ILocationTracker[] = [];
  for (let page = 1; page <= PDF_MAX_PAGES; page++) {
    const res = await locationTrackersApi.getLocationTrackers(
      mergeTrackerFilters(
        {
          page,
          limit: PDF_FETCH_PAGE_SIZE,
          sortBy: "created_at",
          sortOrder: "desc",
        },
        committed
      )
    );
    combined.push(...res.data);
    if (!res.meta.hasNext || res.data.length === 0) break;
  }
  return combined;
}

export default function LocationTrackerStatusPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  /** Last applied filters — API runs only when this or pagination changes. */
  const [committed, setCommitted] = useState<FormState>(emptyForm);
  const [rows, setRows] = useState<ILocationTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ILocationTrackerFilters>({
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [query.page, query.limit, committed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = mergeTrackerFilters(query, committed);
      try {
        setLoading(true);
        const res = await locationTrackersApi.getLocationTrackers(params);
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast({
            title: "Failed to load report",
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
  }, [query.page, query.limit, query.sortOrder, query.sortBy, committed, toast, listVersion]);

  const applyFilters = () => {
    setCommitted({ ...form });
    setQuery(q => ({ ...q, page: 1 }));
  };

  const clearFilters = () => {
    setForm(emptyForm);
    setCommitted(emptyForm);
    setQuery({ page: 1, limit: 20, sortBy: "created_at", sortOrder: "desc" });
  };

  const detailHref = (epc: string) =>
    `/location-tracker-status/${encodeURIComponent(epc)}`;

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const [{ pdf }, { LocationTrackerReportPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/location-tracker-status/location-tracker-report-pdf"),
      ]);
      const allRows = await fetchAllRowsForPdf(committed);
      const filterActive = hasActiveFilters(committed);
      const filterLines: string[] = [];
      if (committed.searchTerm.trim())
        filterLines.push(`Quick search: ${committed.searchTerm.trim()}`);
      if (committed.epc.trim()) filterLines.push(`RFID / EPC: ${committed.epc.trim()}`);
      if (committed.po_number.trim()) filterLines.push(`PO: ${committed.po_number.trim()}`);
      if (committed.item_number.trim())
        filterLines.push(`Item: ${committed.item_number.trim()}`);
      if (committed.location_code.trim())
        filterLines.push(`Location code: ${committed.location_code.trim()}`);
      if (committed.status !== "all") filterLines.push(`Movement: ${committed.status.toUpperCase()}`);
      if (committed.start_date)
        filterLines.push(`From: ${new Date(committed.start_date).toLocaleString()}`);
      if (committed.end_date)
        filterLines.push(`To: ${new Date(committed.end_date).toLocaleString()}`);

      const filterNotes = {
        scopeLabel: filterActive
          ? "Filtered export — rows match the applied search & filters."
          : "Full export — no filters; all movement rows (up to server pagination cap).",
        lines: filterActive
          ? filterLines
          : ["No filters applied. Every row returned by the API for this export is included."],
      };

      const generatedAtLabel = new Date().toLocaleString();
      const logoPngDataUrl = await getAssetiqLogoPngDataUrl();
      const blob = await pdf(
        <LocationTrackerReportPdfDocument
          rows={allRows}
          filterNotes={filterNotes}
          generatedAtLabel={generatedAtLabel}
          logoPngDataUrl={logoPngDataUrl}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      const a = document.createElement("a");
      a.href = url;
      a.download = `location-tracker-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 120_000);

      toast({
        title: "PDF ready",
        description:
          "File downloaded and opened in a new tab. Use the viewer’s print (e.g. Ctrl+P) to print.",
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

  const pageIds = useMemo(() => rows.map(r => r.id), [rows]);
  const selectedOnPageCount = useMemo(
    () => pageIds.filter(id => selectedIds.has(id)).length,
    [pageIds, selectedIds],
  );
  const allPageSelected = pageIds.length > 0 && selectedOnPageCount === pageIds.length;
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected;

  const setPageSelection = (select: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (select) {
        for (const id of pageIds) next.add(id);
      } else {
        for (const id of pageIds) next.delete(id);
      }
      return next;
    });
  };

  /** Radix: click from indeterminate fires `false`, but UX is “select all on page”. */
  const onHeaderSelectAllChange = (value: boolean | "indeterminate") => {
    if (value === true) {
      setPageSelection(true);
      return;
    }
    if (allPageSelected) {
      setPageSelection(false);
    } else {
      setPageSelection(true);
    }
  };

  const toggleRowSelected = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const MAX_BATCH = 200;
    const all = [...selectedIds];
    if (all.length === 0) return;
    const ids = all.slice(0, MAX_BATCH);
    if (all.length > MAX_BATCH) {
      toast({
        title: "Batch limit",
        description: `Only the first ${MAX_BATCH} selected rows will be deleted. Deselect extras and run again if needed.`,
      });
    }
    setDeleteLoading(true);
    try {
      const res = await locationTrackersApi.bulkDeleteMovements(ids);
      toast({
        title: "Movements deleted",
        description: res.message || `${res.data.deleted} row(s) removed.`,
      });
      setSelectedIds(new Set());
      setListVersion(v => v + 1);
      setDeleteDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <PageLayout activePage="location-tracker-status">
      <div className="space-y-6">
        <PageHeader
          title="Location tracker report"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Location tracker report", href: "/location-tracker-status" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & filters
            </CardTitle>
            <CardDescription>
              Filter by RFID (EPC), PO number, item number, location code, date range, or use
              quick search across EPC / item / PO / location / description. Each row is one scan
              (IN = entered location, OUT = left).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="quick">Quick search</Label>
                <Input
                  id="quick"
                  placeholder="EPC, item, PO, location, description…"
                  value={form.searchTerm}
                  onChange={e => setForm(f => ({ ...f, searchTerm: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && applyFilters()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epc">RFID / EPC</Label>
                <Input
                  id="epc"
                  placeholder="EPC or partial tag"
                  value={form.epc}
                  onChange={e => setForm(f => ({ ...f, epc: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && applyFilters()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po">PO number</Label>
                <Input
                  id="po"
                  placeholder="PO number"
                  value={form.po_number}
                  onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && applyFilters()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item">Item number</Label>
                <Input
                  id="item"
                  placeholder="Item number"
                  value={form.item_number}
                  onChange={e => setForm(f => ({ ...f, item_number: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && applyFilters()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Location code</Label>
                <Input
                  id="loc"
                  placeholder="Location code"
                  value={form.location_code}
                  onChange={e => setForm(f => ({ ...f, location_code: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && applyFilters()}
                />
              </div>
              <div className="space-y-2">
                <Label>Movement</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm(f => ({ ...f, status: v as FormState["status"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (IN & OUT)</SelectItem>
                    <SelectItem value="in">IN only</SelectItem>
                    <SelectItem value="out">OUT only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From (date & time)</Label>
                <Input
                  id="from"
                  type="datetime-local"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To (date & time)</Label>
                <Input
                  id="to"
                  type="datetime-local"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rows per page</Label>
                <Select
                  value={String(query.limit ?? 20)}
                  onValueChange={v =>
                    setQuery(q => ({ ...q, limit: Number(v), page: 1 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={applyFilters}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Apply filters
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Movement log
              </CardTitle>
              <CardDescription>
                {meta.total} record{meta.total !== 1 ? "s" : ""} (server-side pagination). Open
                lifecycle for a tag (RFID) to see full IN/OUT history for that EPC. PDF includes all
                pages for the current applied filters (or the full dataset when no filters).
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                disabled={loading || selectedIds.size === 0 || deleteLoading}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading
                  ? "Deleting…"
                  : `Delete selected${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
              </Button>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete selected movements?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes {selectedIds.size} scan row
                      {selectedIds.size !== 1 ? "s" : ""} from the movement log (
                      <code className="rounded bg-muted px-1">inbound_scans</code>
                      ). This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteLoading}
                      onClick={() => void handleBulkDelete()}
                    >
                      {deleteLoading ? "Deleting…" : "Delete"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={pdfLoading || loading}
                onClick={() => void handleExportPdf()}
              >
                <FileDown className="h-4 w-4" />
                {pdfLoading ? "Building PDF…" : "Print / PDF"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No rows match these filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[44px] align-middle">
                          <Checkbox
                            disabled={pageIds.length === 0}
                            checked={
                              allPageSelected ? true : somePageSelected ? "indeterminate" : false
                            }
                            onCheckedChange={onHeaderSelectAllChange}
                            aria-label="Select all on this page"
                          />
                        </TableHead>
                        <TableHead>Date & time</TableHead>
                        <TableHead className="min-w-[200px]">RFID (EPC)</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead className="w-[100px]">IN / OUT</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="w-[120px] text-right">Lifecycle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(row => {
                        const { date, time } = formatDateTime(row.created_at);
                        const epc = row.epc?.trim() ?? "";
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="align-middle">
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={v => toggleRowSelected(row.id, v === true)}
                                aria-label={`Select movement ${row.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{date}</div>
                              <div className="text-xs text-muted-foreground">{time}</div>
                            </TableCell>
                            <TableCell>
                              {epc ? (
                                <Link
                                  href={detailHref(epc)}
                                  className="break-all font-mono text-xs text-primary underline-offset-4 hover:underline"
                                >
                                  {epc}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{row.item_number}</div>
                              {row.item_description && (
                                <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                                  {row.item_description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{row.location_name || "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.location_code || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.po_number}</TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell className="text-right font-medium">{row.quantity}</TableCell>
                            <TableCell className="text-right">
                              {epc ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={detailHref(epc)}>
                                    <ListTree className="mr-1 h-3.5 w-3.5" />
                                    Details
                                  </Link>
                                </Button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {meta.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={meta.page}
                      totalPages={meta.totalPages}
                      totalItems={meta.total}
                      itemsPerPage={meta.limit}
                      onPageChange={p => setQuery(q => ({ ...q, page: p }))}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

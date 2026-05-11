"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Radio, Package, Clock, ArrowRight, ArrowLeft, Activity } from "lucide-react";
import { getSocket } from "@/lib/socket";
import type { InboundLiveSummaryItem } from "@/lib/api/inbound";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** After this much quiet time since the last scan-related event, clear session UI (like inbound idle). */
const OUTBOUND_LIVE_IDLE_MS = 60_000;

interface IUnifiedOutboundEvent {
  id?: number;
  type: "scan" | "location" | "stock";
  requisition_id?: number;
  requisition_number?: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  scanned_quantity?: number;
  requested_quantity?: number;
  lot_no?: string;
  po_number?: string;
  status?: "in" | "out";
  epc?: string;
  timestamp: string;
  location_tracker_cooldown?: boolean;
}

const getUpdatedAtValue = (value?: string | Date | null) => {
  if (!value) return 0;
  const date = typeof value === "string" ? new Date(value) : value;
  const timestamp = date?.getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeLiveEntries = (
  current: InboundLiveSummaryItem[] | undefined,
  updates: InboundLiveSummaryItem[] | undefined
): InboundLiveSummaryItem[] => {
  const key = (item: InboundLiveSummaryItem) =>
    `${item.po_number}|${item.item_number}|${item.epc}`;

  const map = new Map<string, InboundLiveSummaryItem>();
  const currentList = Array.isArray(current) ? current : [];
  const updateList = Array.isArray(updates) ? updates : [];

  currentList.forEach((item) => {
    map.set(key(item), item);
  });

  updateList.forEach((item) => {
    const itemKey = key(item);
    const existing = map.get(itemKey);
    if (!existing) {
      map.set(itemKey, item);
      return;
    }

    const incomingTime = getUpdatedAtValue(item.updated_at);
    const existingTime = getUpdatedAtValue(existing.updated_at);

    if (incomingTime >= existingTime) {
      map.set(itemKey, { ...existing, ...item });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => getUpdatedAtValue(b.updated_at) - getUpdatedAtValue(a.updated_at))
    .slice(0, 80);
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const mapInboundSocketToLiveItem = (data: Record<string, unknown>): InboundLiveSummaryItem | null => {
  const epc = data.epc != null ? String(data.epc).trim() : "";
  if (!epc) return null;

  const ts = String(data.timestamp ?? data.updated_at ?? new Date().toISOString());
  const st = data.status;
  const status = st === "out" ? "out" : st === "in" ? "in" : undefined;

  return {
    po_number: String(data.po_number ?? ""),
    lot_no: data.lot_no != null ? String(data.lot_no) : undefined,
    item_number: String(data.item_number ?? ""),
    item_description:
      data.item_description != null ? String(data.item_description) : undefined,
    ordered_quantity:
      data.ordered_quantity != null ? Number(data.ordered_quantity) : undefined,
    quantity: Number(data.quantity ?? 0),
    epc,
    serial_start: data.serial_start != null ? String(data.serial_start) : undefined,
    serial_end: data.serial_end != null ? String(data.serial_end) : undefined,
    location_name: data.location_name != null ? String(data.location_name) : null,
    location_code: data.location_code != null ? String(data.location_code) : null,
    status,
    updated_at: ts,
  };
};

const mapLocationActivityToLiveItem = (data: Record<string, unknown>): InboundLiveSummaryItem | null => {
  const epcRaw = data.epc != null ? String(data.epc).trim() : "";
  const idPart = data.id != null ? String(data.id) : String(Date.now());
  const epc = epcRaw || `location-event-${idPart}`;
  const ts = String(data.timestamp ?? data.created_at ?? new Date().toISOString());

  return {
    po_number: String(data.po_number ?? ""),
    lot_no:
      data.location_code != null
        ? String(data.location_code)
        : data.lot_no != null
          ? String(data.lot_no)
          : undefined,
    item_number: String(data.item_number ?? ""),
    item_description:
      data.item_description != null ? String(data.item_description) : undefined,
    ordered_quantity: undefined,
    quantity: Number(data.received_quantity ?? data.quantity ?? 0),
    epc,
    serial_start: data.serial_start != null ? String(data.serial_start) : undefined,
    serial_end: data.serial_end != null ? String(data.serial_end) : undefined,
    location_name: data.location_name != null ? String(data.location_name) : null,
    location_code: data.location_code != null ? String(data.location_code) : null,
    status: "out",
    updated_at: ts,
  };
};

export default function OutboundLivePage() {
  const [events, setEvents] = useState<IUnifiedOutboundEvent[]>([]);
  const [liveDetails, setLiveDetails] = useState<InboundLiveSummaryItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  /** Resets idle timer; call on every scan / location / invalid-epc activity. */
  const bumpSessionActivity = useCallback(() => {
    setLastScanTime(Date.now());
  }, []);

  // After 1 minute with no scan activity, clear tables and show RFID idle (reload also starts empty — no API hydrate).
  useEffect(() => {
    if (lastScanTime === 0) return;
    const id = window.setTimeout(() => {
      setEvents([]);
      setLiveDetails([]);
      setIsScanning(false);
      setLastScanTime(0);
    }, OUTBOUND_LIVE_IDLE_MS);
    return () => clearTimeout(id);
  }, [lastScanTime]);

  // Auto-hide progress after 10 seconds of no scanning activity
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        setIsScanning(false);
      }, 10000); // Hide after 10 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [lastScanTime, isScanning]);

  useEffect(() => {
    const socket = getSocket();

    const onInboundNewScan = (data: Record<string, unknown>) => {
      setIsScanning(true);
      bumpSessionActivity();
      const mapped = mapInboundSocketToLiveItem(data);
      if (mapped) {
        setLiveDetails((prev) => mergeLiveEntries(prev, [mapped]));
      }
      const unifiedEvent: IUnifiedOutboundEvent = {
        id: (data.scan_id as number) ?? (data.id as number) ?? Date.now(),
        type: "scan",
        item_number: String(data.item_number ?? ""),
        item_description:
          data.item_description != undefined ? String(data.item_description) : undefined,
        quantity: Number(data.quantity ?? 0),
        scanned_quantity: Number(data.quantity ?? 0),
        requested_quantity:
          data.ordered_quantity != null ? Number(data.ordered_quantity) : undefined,
        lot_no: data.lot_no != null ? String(data.lot_no) : undefined,
        po_number: data.po_number != null ? String(data.po_number) : undefined,
        status: data.status === "out" ? "out" : data.status === "in" ? "in" : undefined,
        epc: data.epc != null ? String(data.epc) : undefined,
        timestamp: String(data.timestamp ?? data.updated_at ?? new Date().toISOString()),
      };
      setEvents((prev) => [unifiedEvent, ...prev].slice(0, 100));
    };

    const onInvalidEpc = (data: Record<string, unknown>) => {
      bumpSessionActivity();
      const playAlert = () => {
        try {
          const audio = new Audio("/warning.mp3");
          void audio.play().catch(() => {
            try {
              const Ctx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
              if (!Ctx) return;
              const ctx = new Ctx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.12;
              osc.start();
              osc.stop(ctx.currentTime + 0.25);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      };
      playAlert();
      const unifiedEvent: IUnifiedOutboundEvent = {
        id: Date.now(),
        type: "scan",
        item_number: "",
        quantity: 0,
        epc: data.epc != null ? String(data.epc) : undefined,
        timestamp:
          data.timestamp != null ? String(data.timestamp) : new Date().toISOString(),
      };
      setEvents((prev) => [unifiedEvent, ...prev].slice(0, 100));
    };

    const onLocationActivity = (data: Record<string, unknown>) => {
      if (data?.status !== "out") return;
      setIsScanning(true);
      bumpSessionActivity();
      const mapped = mapLocationActivityToLiveItem(data);
      if (mapped) {
        setLiveDetails((prev) => mergeLiveEntries(prev, [mapped]));
      }
      const unifiedEvent: IUnifiedOutboundEvent = {
        id: (data.id as number) || Date.now(),
        type: "location",
        item_number: String(data.item_number ?? ""),
        quantity: Number(data.received_quantity ?? data.quantity ?? 0),
        status: "out",
        epc: data.epc != null ? String(data.epc) : undefined,
        timestamp: String(data.timestamp ?? data.created_at ?? new Date().toISOString()),
      };
      setEvents((prev) => [unifiedEvent, ...prev].slice(0, 100));
    };

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("inbound:new-scan", onInboundNewScan);
    socket.on("outbound:invalid-epc", onInvalidEpc);
    socket.on("location-tracker:new-activity", onLocationActivity);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("inbound:new-scan", onInboundNewScan);
      socket.off("outbound:invalid-epc", onInvalidEpc);
      socket.off("location-tracker:new-activity", onLocationActivity);
    };
  }, [bumpSessionActivity]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Dhaka",
    });
  };

  const getEventIcon = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case "scan":
        return <Radio className="h-4 w-4" />;
      case "location":
        return event.status === "out" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />;
      case "stock":
        return <Package className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case "scan":
        if (!event.item_number && event.epc) return "text-red-600";
        return "text-emerald-600";
      case "location":
        return event.status === "out" ? "text-blue-600" : "text-green-600";
      case "stock":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const getEventBgColor = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case "scan":
        if (!event.item_number && event.epc) return "bg-red-100";
        return "bg-emerald-100";
      case "location":
        return event.status === "out" ? "bg-blue-100" : "bg-green-100";
      case "stock":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  const detailRows = useMemo(() => {
    const source = Array.isArray(liveDetails) ? liveDetails : [];
    return [...source].sort(
      (a, b) => getUpdatedAtValue(b.updated_at) - getUpdatedAtValue(a.updated_at)
    );
  }, [liveDetails]);

  const statusBadge = (status?: "in" | "out") => {
    const label = status ? status.toUpperCase() : "—";
    const variant =
      status === "out" ? "destructive" : status === "in" ? "default" : "secondary";
    return <Badge variant={variant}>{label}</Badge>;
  };

  const hasDetailOrEvents = events.length > 0 || detailRows.length > 0;
  const showIdleHero = !hasDetailOrEvents;
  const showMainPanels = hasDetailOrEvents;

  return (
    <PageLayout activePage="outbound">
      <div className="space-y-4">
        <PageHeader
          title="Outbound Gate - Live Dashboard"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Outbound", href: "/outbound/live" },
            { label: "Outbound Gate", href: "/outbound/live" },
          ]}
        />

        {/* Scanning Status Indicator */}
        {isScanning && (
          <Card className="border-2 border-green-500 bg-green-50 mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">Scanning Active - Progress Visible</span>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-gray-600">
                  💡 Location tracker posts have 60-second cooldown, but live updates continue
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RFID Scan Design - Show when no events */}
        {showIdleHero && (
          <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4 py-16">
            <div className="relative flex h-48 w-48 items-center justify-center">
              <span
                className="absolute inline-flex h-40 w-40 animate-ping rounded-full bg-primary/20"
                aria-hidden
              />
              <span
                className="absolute inline-flex h-52 w-52 animate-pulse rounded-full border border-primary/25"
                aria-hidden
              />
              <span
                className="absolute inline-flex h-64 w-64 rounded-full border border-dashed border-primary/20"
                aria-hidden
              />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-background shadow-lg">
                <Radio className={cn("h-16 w-16 text-primary animate-pulse")} aria-hidden />
              </div>
            </div>
            <h2 className="mt-10 text-center text-xl font-semibold tracking-tight md:text-2xl">
              RFID gate ready — outbound
            </h2>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              Waiting for a scan. After {OUTBOUND_LIVE_IDLE_MS / 60_000} minute with no reads, this view returns here.
              Data is not loaded from history on refresh — only live reads in this session.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )}
              />
              {isConnected ? "Socket connected — ready for scans" : "Disconnected — reconnecting…"}
            </div>
          </div>
        )}

        {/* Recent Events Summary + details table (inbound-style) */}
        {showMainPanels && (
          <>
            {events.length > 0 && (
              <Card className="border-2 border-emerald-500 bg-emerald-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-600" />
                      Recent Outbound Activity
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                        {events.length} Events
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span className={isConnected ? "text-green-600" : "text-red-600"}>
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Total Scans</p>
                      <p className="text-4xl font-bold text-emerald-600 mb-2">
                        {events.filter((e) => e.type === "scan").length}
                      </p>
                      <p className="text-sm text-gray-600">Outbound scans</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-700 mb-2">OUT scans</p>
                      <p className="text-4xl font-bold text-blue-600 mb-2">
                        {events.filter((e) => e.type === "scan" && e.status === "out").length}
                      </p>
                      <p className="text-sm text-gray-600">Inbound stream (out)</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items Scanned</p>
                      <p className="text-4xl font-bold text-purple-600 mb-2">
                        {new Set(events.filter((e) => e.type === "scan").map((e) => e.item_number)).size}
                      </p>
                      <p className="text-sm text-gray-600">Unique items</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Location Events</p>
                      <p className="text-4xl font-bold text-orange-600 mb-2">
                        {events.filter((e) => e.type === "location" && e.status === "out").length}
                      </p>
                      <p className="text-sm text-gray-600">Exit events</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-lg font-semibold text-gray-700 mb-4">Latest Scanned Items:</p>
                    <div className="space-y-3">
                      {events
                        .filter((e) => e.type === "scan")
                        .reduce((unique, event) => {
                          const key = `${event.item_number}-${event.requisition_id}`;
                          if (!unique.find((e) => `${e.item_number}-${e.requisition_id}` === key)) {
                            unique.push(event);
                          }
                          return unique;
                        }, [] as IUnifiedOutboundEvent[])
                        .slice(0, 3)
                        .map((event, index) => (
                          <div
                            key={event.id || index}
                            className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${getEventBgColor(event)}`}>
                                <div className={getEventColor(event)}>{getEventIcon(event)}</div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg font-semibold text-gray-900">{event.item_number}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 border-emerald-300"
                                  >
                                    SCANNED
                                  </Badge>
                                  {event.location_tracker_cooldown && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 border-orange-300"
                                    >
                                      COOLDOWN
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <span className="text-gray-500">
                                    ({event.item_description || event.po_number || "Scan"})
                                  </span>
                                  {event.requisition_id != null && (
                                    <span className="text-blue-600 font-medium ml-2">
                                      [Req #{event.requisition_id}]
                                    </span>
                                  )}
                                  {event.po_number && (
                                    <span className="text-slate-600 font-medium ml-2">PO: {event.po_number}</span>
                                  )}
                                  {event.lot_no && (
                                    <span className="text-purple-600 font-medium ml-2">Lot: {event.lot_no}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-700 mb-2">
                                {event.requested_quantity && event.scanned_quantity ? (
                                  <span>
                                    <span className="text-emerald-600 font-bold text-lg">
                                      {event.scanned_quantity.toLocaleString()}
                                    </span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-blue-600 font-bold text-lg">
                                      {event.requested_quantity.toLocaleString()}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-lg">
                                    {event.quantity?.toLocaleString() || "N/A"}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500 font-medium">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>Live scan details</CardTitle>
                  <CardDescription>
                    Same detail columns as inbound gate — PO / lot, item, ordered vs scanned qty, location, status,
                    serial range, and last update (live socket only for this session).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className={isConnected ? "text-green-600" : "text-red-600"}>
                    {isConnected ? "Socket live" : "Disconnected"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {detailRows.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No scan rows in this session yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO / Lot</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Ordered</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Serial range</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRows.map((item) => (
                          <TableRow key={`${item.po_number}-${item.epc}`}>
                            <TableCell>
                              <div className="font-medium">{item.po_number || "—"}</div>
                              <div className="text-xs text-muted-foreground">Lot {item.lot_no ?? "—"}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.item_number}</div>
                              <div className="text-xs text-muted-foreground">{item.item_description ?? "—"}</div>
                            </TableCell>
                            <TableCell>{item.ordered_quantity ?? "—"}</TableCell>
                            <TableCell className="font-semibold">{item.quantity}</TableCell>
                            <TableCell>
                              <div>{item.location_name ?? "Unassigned"}</div>
                              <div className="text-xs text-muted-foreground">{item.location_code ?? "—"}</div>
                            </TableCell>
                            <TableCell>{statusBadge(item.status)}</TableCell>
                            <TableCell className="text-xs">
                              {item.serial_start || item.serial_end
                                ? `${item.serial_start ?? "—"} → ${item.serial_end ?? "—"}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(item.updated_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}

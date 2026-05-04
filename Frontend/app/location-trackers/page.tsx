"use client";

import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, ArrowRight, ArrowLeft, Activity, Radio } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

/** Minutes after last scan before returning to RFID idle screen */
const LIVE_IDLE_MINUTES = 3;
const LIVE_IDLE_MS = LIVE_IDLE_MINUTES * 60 * 1000;

interface IUnifiedEvent {
  id?: number;
  type: "scan" | "location";
  po_number: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  location_code?: string;
  location_name?: string;
  status: "in" | "out";
  epc?: string;
  timestamp: string;
  isDuplicate?: boolean;
}

function liveTimestamp(data: Record<string, unknown>): string {
  const v = data.updated_at ?? data.created_at ?? data.timestamp;
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toISOString().slice(0, 10);
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Stable heading for a YYYY-MM-DD bucket (matches UTC dateKey from dateKey()). */
function headingFromDateKey(key: string): string {
  if (key === "unknown") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return key;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function locationLabel(e: IUnifiedEvent): string {
  const name = e.location_name?.trim();
  const code = e.location_code?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || "—";
}

export default function LocationTrackersPage() {
  const [hasLiveTrackingActivity, setHasLiveTrackingActivity] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [unifiedEvents, setUnifiedEvents] = useState<IUnifiedEvent[]>([]);

  const eventsByDate = useMemo(() => {
    const groups = new Map<string, IUnifiedEvent[]>();
    for (const ev of unifiedEvents) {
      const key = dateKey(ev.timestamp);
      const list = groups.get(key) ?? [];
      list.push(ev);
      groups.set(key, list);
    }
    const keys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map(k => {
      const bucket = groups.get(k) ?? [];
      const events = [...bucket].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return {
        key: k,
        label: headingFromDateKey(k),
        events,
      };
    });
  }, [unifiedEvents]);

  useEffect(() => {
    const socket = getSocket();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleReturnToIdle = () => {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        setHasLiveTrackingActivity(false);
        setUnifiedEvents([]);
        idleTimer = null;
      }, LIVE_IDLE_MS);
    };

    const bumpLiveSession = () => {
      setHasLiveTrackingActivity(true);
      scheduleReturnToIdle();
    };

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("inbound:new-scan", (raw: Record<string, unknown>) => {
      bumpLiveSession();
      const ts = liveTimestamp(raw);
      const sid = Number(raw.id ?? raw.scan_id ?? Date.now());
      const status: "in" | "out" =
        raw.status === "out" ? "out" : raw.status === "in" ? "in" : "in";
      const unifiedEvent: IUnifiedEvent = {
        id: sid,
        type: "scan",
        po_number: String(raw.po_number ?? ""),
        item_number: String(raw.item_number ?? ""),
        item_description:
          typeof raw.item_description === "string" ? raw.item_description : undefined,
        quantity: Number(raw.quantity ?? 0),
        location_code: typeof raw.location_code === "string" ? raw.location_code : undefined,
        location_name: typeof raw.location_name === "string" ? raw.location_name : undefined,
        status,
        epc: typeof raw.epc === "string" ? raw.epc : undefined,
        timestamp: ts,
        isDuplicate: Boolean(raw.isDuplicate),
      };
      setUnifiedEvents(prev => [unifiedEvent, ...prev].slice(0, 200));
    });

    socket.on("location-tracker:new-activity", (raw: Record<string, unknown>) => {
      bumpLiveSession();
      const ts = liveTimestamp(raw);
      const unifiedEvent: IUnifiedEvent = {
        id: Number(raw.id ?? Date.now()),
        type: "location",
        po_number: String(raw.po_number ?? ""),
        item_number: String(raw.item_number ?? ""),
        quantity: Number(raw.quantity ?? 0),
        location_code: typeof raw.location_code === "string" ? raw.location_code : undefined,
        location_name: typeof raw.location_name === "string" ? raw.location_name : undefined,
        status: raw.status === "out" ? "out" : "in",
        epc: typeof raw.epc === "string" ? raw.epc : undefined,
        timestamp: ts,
      };
      setUnifiedEvents(prev => [unifiedEvent, ...prev].slice(0, 200));
    });

    return () => {
      clearIdleTimer();
      socket.off("connect");
      socket.off("disconnect");
      socket.off("inbound:new-scan");
      socket.off("location-tracker:new-activity");
    };
  }, []);

  const idleHero = (
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
          <Radio className="h-16 w-16 text-primary" aria-hidden />
        </div>
      </div>
      <h2 className="mt-10 text-center text-xl font-semibold tracking-tight md:text-2xl">
        RFID location scanning
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Waiting for a scan. Item, date, location, and IN/OUT will appear here. After{" "}
        {LIVE_IDLE_MINUTES} minutes without a read, this screen returns here automatically.
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
  );

  return (
    <PageLayout activePage="location-trackers">
      <div className="space-y-6">
        <PageHeader
          title="Location trackers — live scan"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Location Trackers", href: "/location-trackers" },
          ]}
          actions={
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Live" : "Offline"}
            </Badge>
          }
        />

        {!hasLiveTrackingActivity ? (
          idleHero
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live scans (by date)
                  </CardTitle>
                  <CardDescription>
                    EPC, item, time, location, and IN/OUT from RFID reads only. Full reports belong
                    elsewhere. Idle after {LIVE_IDLE_MINUTES} minutes with no new read.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHasLiveTrackingActivity(false);
                    setUnifiedEvents([]);
                  }}
                >
                  End session
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {eventsByDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events in this session yet.</p>
              ) : (
                eventsByDate.map(group => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold">{group.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {group.events.length} read{group.events.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Time</TableHead>
                            <TableHead className="min-w-[200px]">EPC</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="w-[100px]">IN / OUT</TableHead>
                            <TableHead className="hidden lg:table-cell">PO</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.events.map((ev, idx) => (
                            <TableRow
                              key={`${ev.id ?? ev.timestamp}-${idx}`}
                              className={idx === 0 ? "bg-primary/5" : undefined}
                            >
                              <TableCell className="whitespace-nowrap font-mono text-xs">
                                {formatTime(ev.timestamp)}
                              </TableCell>
                              <TableCell>
                                <div
                                  className="max-w-[280px] break-all font-mono text-xs leading-snug text-foreground"
                                  title={ev.epc || undefined}
                                >
                                  {ev.epc?.trim() ? ev.epc : "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{ev.item_number || "—"}</div>
                                {ev.item_description && (
                                  <div className="max-w-xs truncate text-xs text-muted-foreground">
                                    {ev.item_description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{locationLabel(ev)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1">
                                  <Badge
                                    variant={ev.status === "in" ? "default" : "secondary"}
                                    className="gap-1"
                                  >
                                    {ev.status === "in" ? (
                                      <ArrowRight className="h-3 w-3" />
                                    ) : (
                                      <ArrowLeft className="h-3 w-3" />
                                    )}
                                    {ev.status.toUpperCase()}
                                  </Badge>
                                  {ev.isDuplicate && (
                                    <Badge variant="outline" className="text-xs">
                                      Dup
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden font-mono text-xs lg:table-cell">
                                {ev.po_number || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}

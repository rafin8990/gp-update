/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw, Radio, Activity, Download } from 'lucide-react';
import {
  inboundApi,
  InboundLiveSummaryItem,
  InboundItemSummary,
} from '@/lib/api/inbound';
import { PageLayout } from '@/components/layout/page-layout';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type ActivityLogItem = {
  id: string;
  message: string;
  subtitle: string;
  timestamp: string;
  location?: string | null;
  status?: 'in' | 'out';
};

type InboundSocketPayload = {
  po_number: string;
  lot_no: string;
  item_number: string;
  item_description?: string;
  location_name?: string | null;
  location_code?: string | null;
  quantity: number;
  ordered_quantity?: number;
  epc: string;
  serial_start?: string;
  serial_end?: string;
  status?: 'in' | 'out';
  timestamp?: string;
  updated_at?: string;
};

const DUPLICATE_WINDOW_MS = 2 * 1000;

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getUpdatedAtValue = (value?: string | Date | null) => {
  if (!value) return 0;
  const date = typeof value === 'string' ? new Date(value) : value;
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

  currentList.forEach(item => {
    map.set(key(item), item);
  });

  updateList.forEach(item => {
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

const buildActivityTitle = (payload: InboundSocketPayload) =>
  payload.item_description || payload.item_number;

const buildActivitySubtitle = (payload: InboundSocketPayload) => {
  const status = (payload.status ?? 'in').toUpperCase();
  const location = payload.location_name ?? 'Unknown';
  return `${payload.item_number} • ${status} @ ${location}`;
};

export default function WarehouseGatePage() {
  const { toast } = useToast();
  const [hasLiveScanEvent, setHasLiveScanEvent] = useState(false);
  const [liveData, setLiveData] = useState<InboundLiveSummaryItem[]>([]);
  const [itemSummary, setItemSummary] = useState<InboundItemSummary[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const duplicateGuard = useRef<Map<string, number>>(new Map());

  const fetchLive = async () => {
    try {
      setIsRefreshing(true);
      const data = await inboundApi.getLiveSummary(80);
      setLiveData(prev => mergeLiveEntries(prev, data));
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to load live data',
        description:
          error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchItemSummary = async () => {
    try {
      const data = await inboundApi.getItemWiseSummary();
      setItemSummary(data);
    } catch (error) {
      console.error('Failed to load item summary:', error);
    }
  };

  useEffect(() => {
    fetchLive();
    fetchItemSummary();
    const interval = setInterval(() => {
      fetchLive();
      fetchItemSummary();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleInboundEvent = (payload: InboundSocketPayload) => {
      setHasLiveScanEvent(true);
      const now = Date.now();
      const dedupKey = `${payload.epc}|${payload.status}|${payload.location_code ?? ''}`;
      const lastSeen = duplicateGuard.current.get(dedupKey);
      if (lastSeen && now - lastSeen < DUPLICATE_WINDOW_MS) {
        return;
      }
      duplicateGuard.current.set(dedupKey, now);
      if (duplicateGuard.current.size > 200) {
        duplicateGuard.current.forEach((timestamp, key) => {
          if (now - timestamp > DUPLICATE_WINDOW_MS) {
            duplicateGuard.current.delete(key);
          }
        });
      }

      setLiveData(prev => {
        const mapped: InboundLiveSummaryItem = {
          po_number: payload.po_number,
          lot_no: payload.lot_no,
          item_number: payload.item_number,
          item_description: payload.item_description,
          ordered_quantity: payload.ordered_quantity,
          quantity: payload.quantity,
          epc: payload.epc,
          serial_start: payload.serial_start,
          serial_end: payload.serial_end,
          location_code: payload.location_code,
          location_name: payload.location_name,
          status: payload.status,
          updated_at:
            payload.updated_at ?? payload.timestamp ?? new Date().toISOString(),
        };

        return mergeLiveEntries(prev, [mapped]);
      });

      // Update item summary in real-time when scan comes in
      fetchItemSummary();

      setActivityLog(prev => {
        const next: ActivityLogItem[] = [
          {
            id: `${payload.epc}-${payload.timestamp ?? Date.now()}`,
            message: buildActivityTitle(payload),
            subtitle: buildActivitySubtitle(payload),
            timestamp: formatDate(
              payload.updated_at ?? payload.timestamp ?? new Date().toISOString()
            ),
            location: payload.location_name,
            status: payload.status,
          },
          ...prev,
        ];
        return next.slice(0, 25);
      });
      setLastUpdated(new Date());
    };

    socket.on('inbound:new-scan', handleInboundEvent);
    return () => {
      socket.off('inbound:new-scan', handleInboundEvent);
    };
  }, []);

  const filteredData = useMemo<InboundLiveSummaryItem[]>(() => {
    const source = Array.isArray(liveData) ? liveData : [];
    return [...source].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [liveData]);

  const stats = useMemo(() => {
    const totalPOs = new Set(filteredData.map(item => item.po_number)).size;
    const uniqueLocations = new Set(
      filteredData.map(item => item.location_name ?? 'Unassigned')
    ).size;
    const totalQuantity = filteredData.reduce<number>(
      (sum, item) => sum + (item.status === 'out' ? 0 : item.quantity ?? 0),
      0
    );
    return { totalPOs, uniqueLocations, totalQuantity };
  }, [filteredData]);

  const statusBadge = (status?: 'in' | 'out') => {
    const label = status ? status.toUpperCase() : 'INBOUND';
    const variant =
      status === 'out'
        ? 'destructive'
        : status === 'in'
        ? 'default'
        : 'secondary';
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleManualRefresh = async () => {
    await Promise.all([fetchLive(), fetchItemSummary()]);
    toast({ title: 'Live dashboard updated' });
  };

  const handleExport = async () => {
    try {
      const csv = (await inboundApi.exportMovements({}, 'csv')) as string;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inbound-rfid-${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export completed' });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    }
  };

  const hasInboundActivity = hasLiveScanEvent;

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
          <Radio
            className={cn(
              'h-16 w-16 text-primary',
              isLoading && 'animate-pulse'
            )}
            aria-hidden
          />
        </div>
      </div>
      <h2 className="mt-10 text-center text-xl font-semibold tracking-tight md:text-2xl">
        RFID gate ready
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Waiting for a scan. Tables, stats, and the activity log will appear here
        when live inbound data is received.
      </p>
      {isLoading && (
        <p className="mt-4 text-xs text-muted-foreground">Loading…</p>
      )}
    </div>
  );

  return (
    <PageLayout activePage="inbound">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Warehouse Inbound Gate
            </h1>
            <p className="text-sm text-muted-foreground">
              {hasInboundActivity
                ? 'Live RFID activity by purchase order, lot, and location.'
                : 'Start scanning — the live dashboard will open automatically.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                className={cn(
                  'mr-2 h-4 w-4',
                  isRefreshing && 'animate-spin'
                )}
              />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {hasInboundActivity && (
              <Badge variant="secondary">
                Last update: {lastUpdated ? formatDate(lastUpdated) : '—'}
              </Badge>
            )}
          </div>
        </div>

        {!hasInboundActivity ? (
          idleHero
        ) : (
          <>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Purchase Orders
              </CardTitle>
              <Radio className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPOs}</div>
              <p className="text-xs text-muted-foreground">
                Unique POs with live inbound reads
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Locations
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
              <p className="text-xs text-muted-foreground">
                Distinct gate/device locations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Items in Queue
              </CardTitle>
              <Badge variant="outline">Qty</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuantity}</div>
              <p className="text-xs text-muted-foreground">
                Total EPC bundles currently reading IN
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item-wise Received Summary</CardTitle>
            <CardDescription>
              Total quantity received per item from all scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemSummary.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No items scanned yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SL No</TableHead>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead>Order Total Quantity</TableHead>
                      <TableHead>Received Total Quantity</TableHead>
                      <TableHead>Serial Number Start</TableHead>
                      <TableHead>Serial Number End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemSummary.map((item, index) => (
                      <TableRow key={item.item_number}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {item.item_number}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.item_description ?? '—'}
                        </TableCell>
                        <TableCell>
                          {item.order_total_quantity ?? '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {item.received_total_quantity}
                        </TableCell>
                        <TableCell>
                          {item.serial_start ?? '—'}
                        </TableCell>
                        <TableCell>
                          {item.serial_end ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Live Inbound Items</CardTitle>
              <CardDescription>
                Latest RFID reads with ordered vs received quantity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredData.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No inbound activity matches your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO / Lot</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Ordered</TableHead>
                        <TableHead>Inbound Qty</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Serial Range</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map(item => (
                        <TableRow key={`${item.po_number}-${item.epc}`}>
                          <TableCell>
                            <div className="font-medium">
                              {item.po_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Lot {item.lot_no ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.item_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.item_description ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell>{item.ordered_quantity ?? '—'}</TableCell>
                          <TableCell className="font-semibold">
                            {item.quantity}
                          </TableCell>
                          <TableCell>
                            <div>{item.location_name ?? 'Unassigned'}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.location_code ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(item.status)}</TableCell>
                          <TableCell className="text-xs">
                            {item.serial_start || item.serial_end
                              ? `${item.serial_start ?? '—'} → ${
                                  item.serial_end ?? '—'
                                }`
                              : '—'}
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

          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Most recent EPC movements with IN/OUT toggles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No live activity yet. Scans will appear here.
                </p>
              ) : (
                activityLog.map(entry => (
                  <div
                    key={entry.id}
                    className="rounded-lg border bg-muted/40 p-3 text-sm"
                  >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.message}</span>
                      {statusBadge(entry.status)}
                    </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.subtitle}
                  </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.location ?? 'Unassigned'} · {entry.timestamp}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}


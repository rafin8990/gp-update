import axiosInstance from "../axios";
import { stockApi } from "./stock";
import { locationsApi } from "./locations";
import { itemsApi } from "./items";
import { purchaseOrdersApi } from "./purchase-orders";
import { locationTrackersApi } from "./location-trackers";
import type { InboundLiveSummaryItem } from "./inbound";
import type { IPurchaseOrder } from "./purchase-orders.types";

export interface DashboardMetric {
  name: string;
  value: number;
  icon: string;
  label: string;
}

export interface DashboardChartBlock {
  value: number;
  status: string;
  statusIcon: string;
  chart: { labels: string[]; data: number[] };
}

export interface DashboardBundle {
  metrics: DashboardMetric[];
  assetPerformance: DashboardChartBlock;
  assetQuantity: DashboardChartBlock;
  serviceScheduleStatus: { labels: string[]; data: number[] };
  checkInOutActivity: {
    growth: number;
    period: string;
    chart: { labels: string[]; data: number[] };
  };
  lastUpdated: string;
  /** True if some requests failed (partial data). */
  partial: boolean;
}

function buildLast12MonthBuckets(): { keys: string[]; labels: string[] } {
  const keys: string[] = [];
  const labels: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return { keys, labels };
}

function aggregateInboundScansByMonth(rows: InboundLiveSummaryItem[]): {
  labels: string[];
  data: number[];
} {
  const { keys, labels } = buildLast12MonthBuckets();
  const counts = new Map<string, number>();
  keys.forEach(k => counts.set(k, 0));
  for (const r of rows) {
    const t = r.updated_at;
    if (!t) continue;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { labels, data: keys.map(k => counts.get(k) ?? 0) };
}

function countOpenPurchaseOrders(rows: IPurchaseOrder[]): number {
  return rows.filter(
    r => r.order_status === "pending" || r.order_status === "partially_received"
  ).length;
}

function uniqueSupplierCount(rows: IPurchaseOrder[]): number {
  const s = new Set<number>();
  for (const r of rows) {
    if (r.supplier_id != null && r.supplier_id !== undefined) s.add(Number(r.supplier_id));
  }
  return s.size;
}

function topNByQuantity<T extends { item_number?: string; total_quantity?: number }>(
  summary: T[],
  n: number
): { labels: string[]; data: number[] } {
  const sorted = [...summary].sort(
    (a, b) => Number(b.total_quantity ?? 0) - Number(a.total_quantity ?? 0)
  );
  const slice = sorted.slice(0, n);
  return {
    labels: slice.map(r => String(r.item_number ?? "—").slice(0, 12)),
    data: slice.map(r => Math.round(Number(r.total_quantity ?? 0))),
  };
}

/**
 * Loads dashboard KPIs and charts from authenticated API routes.
 */
export async function fetchDashboardBundle(): Promise<DashboardBundle> {
  let partial = false;

  const safeNum = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const results = await Promise.allSettled([
    stockApi.getLiveStockData(),
    locationsApi.getAll({ limit: 1, offset: 0 }),
    itemsApi.getAll({ limit: 1, offset: 0 }),
    purchaseOrdersApi.getAll({ limit: 1, offset: 0 }),
    purchaseOrdersApi.getAll({ limit: 400, offset: 0 }),
    axiosInstance.get<{ success?: boolean; data?: InboundLiveSummaryItem[] }>(
      "/inbound/live",
      { params: { limit: 500 } }
    ),
    locationTrackersApi.getLocationTrackerStats(),
  ]);

  const [liveStock, locRes, itemsRes, poMetaRes, poSampleRes, inboundRes, trackerRes] = results;

  if (liveStock.status === "rejected") partial = true;
  if (locRes.status === "rejected") partial = true;
  if (itemsRes.status === "rejected") partial = true;
  if (poMetaRes.status === "rejected") partial = true;
  if (poSampleRes.status === "rejected") partial = true;
  if (inboundRes.status === "rejected") partial = true;
  if (trackerRes.status === "rejected") partial = true;

  const stockData = liveStock.status === "fulfilled" ? liveStock.value.data : null;
  const stats = stockData?.stats;
  const summary = stockData?.summary ?? [];

  const totalLocations =
    locRes.status === "fulfilled" ? safeNum(locRes.value.meta?.total, 0) : 0;
  const totalItems =
    itemsRes.status === "fulfilled" ? safeNum(itemsRes.value.meta?.total, 0) : 0;
  const totalPOs =
    poMetaRes.status === "fulfilled" ? safeNum(poMetaRes.value.meta?.total, 0) : 0;

  const poSample =
    poSampleRes.status === "fulfilled" ? poSampleRes.value.data ?? [] : [];
  const pendingPOs = countOpenPurchaseOrders(poSample);
  const totalVendors = uniqueSupplierCount(poSample);

  const inboundEnvelope =
    inboundRes.status === "fulfilled" ? inboundRes.value.data : undefined;
  const inboundRows = inboundEnvelope?.data ?? [];

  const trackerStats =
    trackerRes.status === "fulfilled" ? trackerRes.value.data : null;
  const rfidReaders = trackerStats
    ? safeNum(trackerStats.current_in, 0) + safeNum(trackerStats.current_out, 0)
    : inboundRows.length;

  const uniqueItems = safeNum(stats?.unique_items, 0);
  const totalQty = safeNum(stats?.total_quantity, 0);

  const { labels: monthLabels, data: monthData } = aggregateInboundScansByMonth(inboundRows);

  const topItems = topNByQuantity(summary, 6);
  const topQty = topNByQuantity(summary, 6);

  const metrics: DashboardMetric[] = [
    { name: "locations", value: totalLocations, icon: "/dashboard/floors.svg", label: "Total Locations" },
    { name: "rfid", value: rfidReaders, icon: "/dashboard/readers.svg", label: "RFID activity (IN+OUT tags)" },
    { name: "vendors", value: totalVendors, icon: "/dashboard/vendors.svg", label: "Suppliers (sample)" },
    { name: "items", value: totalItems, icon: "/dashboard/assets.svg", label: "Total Items" },
    { name: "stock_items", value: uniqueItems, icon: "/dashboard/assets.svg", label: "Stock rows (distinct items)" },
    { name: "stock_quantity", value: Math.round(totalQty), icon: "/dashboard/readers.svg", label: "Total Stock Quantity" },
    { name: "purchase_orders", value: totalPOs, icon: "/dashboard/vendors.svg", label: "Total Purchase Orders" },
    {
      name: "pending_purchase_orders",
      value: pendingPOs,
      icon: "/dashboard/readers.svg",
      label: "Open POs (pending / partial, sample)",
    },
  ];

  const bundle: DashboardBundle = {
    metrics,
    assetPerformance: {
      value: uniqueItems,
      status: partial ? "Partial" : "Live",
      statusIcon: "/dashboard/good.svg",
      chart: {
        labels: topItems.labels.length ? topItems.labels : ["—"],
        data: topItems.data.length ? topItems.data : [0],
      },
    },
    assetQuantity: {
      value: Math.round(totalQty),
      status: partial ? "Partial" : "Live",
      statusIcon: "/dashboard/good.svg",
      chart: {
        labels: topQty.labels.length ? topQty.labels : ["—"],
        data: topQty.data.length ? topQty.data : [0],
      },
    },
    serviceScheduleStatus: { labels: [], data: [] },
    checkInOutActivity: {
      growth: safeNum(stats?.recent_updates, 0),
      period: "Last 12 months (inbound scan sample)",
      chart: { labels: monthLabels, data: monthData },
    },
    lastUpdated: new Date().toISOString(),
    partial,
  };

  return bundle;
}

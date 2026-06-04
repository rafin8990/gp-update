"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalAreaChart } from "@/components/charts/ProfessionalAreaChart";
import { ProfessionalBarChart } from "@/components/charts/ProfessionalBarChart";
import { ProfessionalLineChart } from "@/components/charts/ProfessionalLineChart";
import { ProfessionalPieChart } from "@/components/charts/ProfessionalPieChart";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AssetPerformanceCard } from "@/components/charts/AssetPerformanceCard";
import { AssetQuantityCard } from "@/components/charts/AssetQuantityCard";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import {
  Package,
  Warehouse,
  ShoppingCart,
  MapPin,
  Activity,
  CheckCircle2,
  Radio,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Users,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  fetchDashboardBundle,
  type DashboardBundle,
  type DashboardMetric,
} from "@/lib/api/dashboard";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const bundle = await fetchDashboardBundle();
      setDashboardData(bundle);
      if (bundle.partial) {
        toast.warning("Some dashboard data sources failed; figures may be incomplete.");
      } else if (isManualRefresh) {
        toast.success("Dashboard updated");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not load dashboard");
      setDashboardData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    const id = setInterval(() => void loadDashboard(false), 120_000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  if (loading && !dashboardData) {
    return <Loading variant="fullscreen" />;
  }

  if (!dashboardData) {
    return (
      <PageLayout activePage="dashboard">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground mb-4">Dashboard data could not be loaded.</p>
          <Button onClick={() => void loadDashboard(true)}>Retry</Button>
        </div>
      </PageLayout>
    );
  }

  const { metrics, assetPerformance, assetQuantity, checkInOutActivity } = dashboardData;
  const areaChartLabels = checkInOutActivity.chart.labels;
  const areaChartData = checkInOutActivity.chart.data;
  const lastUpdatedLabel = new Date(dashboardData.lastUpdated).toLocaleString();

  const getMetric = (name: string) =>
    metrics.find((m: DashboardMetric) => m.name === name)?.value ?? 0;

  const pieChartData = [
    { name: "Locations", value: getMetric("locations") },
    { name: "Stock items", value: getMetric("stock_items") },
    { name: "Purchase orders", value: getMetric("purchase_orders") },
    { name: "Suppliers (sample)", value: getMetric("vendors") },
  ].filter(item => item.value > 0);

  return (
    <PageLayout activePage="dashboard">
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-[#4DC591] to-[#3B82F6] shadow-lg">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <Image
                  src="/logo/ev-logo.svg"
                  alt="ev Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div className="text-white">
                <h1 className="mb-1 text-3xl font-bold">ev Warehouse Management System</h1>
                <p className="text-sm text-white/90">
                  Live metrics from stock, inbound scans, purchase orders, and locations
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dashboardData.partial && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                  Partial data
                </Badge>
              )}
              <span className="text-xs text-white/80">Updated {lastUpdatedLabel}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={refreshing}
                onClick={() => void loadDashboard(true)}
                className="shrink-0"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access frequently used warehouse operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              <Link href="/inbound/warehouse-gate">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <ArrowLeft className="mb-2 h-8 w-8 text-blue-600" />
                    <p className="text-sm font-medium">Inbound</p>
                    <p className="mt-1 text-xs text-muted-foreground">Receiving</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/outbound/live">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <ArrowRight className="mb-2 h-8 w-8 text-green-600" />
                    <p className="text-sm font-medium">Outbound</p>
                    <p className="mt-1 text-xs text-muted-foreground">Dispatching</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/self-tracker">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <Activity className="mb-2 h-8 w-8 text-purple-600" />
                    <p className="text-sm font-medium">Self Tracker</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live Tracking</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/location-tracker-status">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <MapPin className="mb-2 h-8 w-8 text-orange-600" />
                    <p className="text-sm font-medium">Location Status</p>
                    <p className="mt-1 text-xs text-muted-foreground">Reports</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/stock">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <Warehouse className="mb-2 h-8 w-8 text-cyan-600" />
                    <p className="text-sm font-medium">Stock</p>
                    <p className="mt-1 text-xs text-muted-foreground">Inventory</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/requisitions">
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <ClipboardList className="mb-2 h-8 w-8 text-indigo-600" />
                    <p className="text-sm font-medium">Requisitions</p>
                    <p className="mt-1 text-xs text-muted-foreground">Requests</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("locations")}</div>
              <p className="text-xs text-muted-foreground">Warehouse storage locations</p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock (distinct items)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("stock_items")}</div>
              <p className="text-xs text-muted-foreground">From live stock snapshot</p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("stock_quantity").toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Sum of on-hand quantities</p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RFID tag activity</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("rfid")}</div>
              <p className="text-xs text-muted-foreground">Latest IN+OUT tags (tracker)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("items")}</div>
              <p className="text-xs text-muted-foreground">Items in ERP master</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("purchase_orders")}</div>
              <p className="text-xs text-muted-foreground">Total PO headers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open POs (sample)</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {getMetric("pending_purchase_orders")}
              </div>
              <p className="text-xs text-muted-foreground">Pending / partial in recent batch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suppliers (sample)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetric("vendors")}</div>
              <p className="text-xs text-muted-foreground">Distinct suppliers in PO sample</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AssetPerformanceCard
            value={assetPerformance.value}
            status={assetPerformance.status}
            statusIcon={assetPerformance.statusIcon}
            chart={assetPerformance.chart}
          />
          <AssetQuantityCard
            value={assetQuantity.value}
            status={assetQuantity.status}
            statusIcon={assetQuantity.statusIcon}
            chart={assetQuantity.chart}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfessionalAreaChart
            labels={areaChartLabels}
            data={areaChartData}
            title="Inbound scan activity"
            description={checkInOutActivity.period}
            color="#4DC591"
          />

          <ProfessionalLineChart
            labels={areaChartLabels}
            data={areaChartData}
            title="Inbound trend (same data)"
            description="Counts from latest inbound live sample by month"
            color="#3B82F6"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfessionalBarChart
            labels={assetPerformance.chart.labels}
            data={assetPerformance.chart.data}
            title="Top items by stock quantity"
            description="Largest lines in current stock summary"
            color="#8B5CF6"
          />

          <ProfessionalPieChart
            data={pieChartData}
            title="Resource mix"
            description="Locations, stock items, POs, suppliers (non-zero only)"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                System snapshot
              </CardTitle>
              <CardDescription>Derived from the same APIs as the metrics above</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">API data</span>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    {dashboardData.partial ? "Degraded" : "OK"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Stock updates (last hour): {checkInOutActivity.growth}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

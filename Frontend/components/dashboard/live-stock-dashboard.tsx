"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, Clock, Hash, Building2, Activity } from 'lucide-react';
import { stockApi, IStockStats, IStockSummary } from '@/lib/api/stock';
import { getSocket } from '@/lib/socket';

interface LiveStockDashboardProps {
  isConnected: boolean;
}

export function LiveStockDashboard({ isConnected }: LiveStockDashboardProps) {
  const [stats, setStats] = useState<IStockStats | null>(null);
  const [summary, setSummary] = useState<IStockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live stock data
  const fetchLiveStockData = async () => {
    try {
      setLoading(true);
      const response = await stockApi.getLiveStockData();
      setStats(response.data.stats);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch live stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStockData();
  }, []);

  // Socket connection for live updates
  useEffect(() => {
    const socket = getSocket();

    // Listen for stock updates
    socket.on('stock:updated', (data) => {
      console.log('📦 Live stock update received:', data);
      fetchLiveStockData(); // Refresh data
    });

    return () => {
      socket.off('stock:updated');
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Live Stock Dashboard
          </CardTitle>
          <CardDescription>Loading stock data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Live Stock Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? 'Live Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Real-time stock quantities and item tracking
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stock Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_items}</div>
              <p className="text-xs text-muted-foreground">Stock records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.total_quantity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Units in stock</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
              <Hash className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.unique_items}</div>
              <p className="text-xs text-muted-foreground">Different items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.unique_pos}</div>
              <p className="text-xs text-muted-foreground">Active POs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.recent_updates}</div>
              <p className="text-xs text-muted-foreground">Last hour</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Items Summary */}
      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Items by Quantity
            </CardTitle>
            <CardDescription>
              Items with highest stock quantities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Lots</TableHead>
                  <TableHead className="text-right">POs</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.slice(0, 10).map((item, index) => (
                  <TableRow key={item.item_number} className={index === 0 ? 'bg-green-50' : ''}>
                    <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.item_description}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {item.total_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{item.lot_count}</TableCell>
                    <TableCell className="text-right">{item.po_count}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

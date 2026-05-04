"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, Clock, Hash, Building2, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface LiveItemScanDashboardProps {
  isConnected: boolean;
}

interface ItemScanEntry {
  id: string;
  po_number: string;
  item_number: string;
  item_description: string;
  received_quantity: number;
  scanned_quantity: number;
  ordered_quantity: number;
  remaining_quantity: number;
  lot_no: string;
  timestamp: string;
  epc: string;
  location_name: string;
  location_status: 'in' | 'out';
  user_id: number;
}

export function LiveItemScanDashboard({ isConnected }: LiveItemScanDashboardProps) {
  const [scanEntries, setScanEntries] = useState<ItemScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_scans: 0,
    total_items_scanned: 0,
    total_quantity_scanned: 0,
    unique_items: 0,
    unique_pos: 0,
  });

  // Add new scan entry to the list
  const addScanEntry = (data: ItemScanEntry) => {
    const newEntry = {
      ...data,
      id: `${data.po_number}-${data.item_number}-${data.epc}-${Date.now()}`,
    };
    
    setScanEntries(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 entries
    
    // Update stats
    setStats(prev => ({
      total_scans: prev.total_scans + 1,
      total_items_scanned: prev.total_items_scanned + data.scanned_quantity,
      total_quantity_scanned: prev.total_quantity_scanned + data.scanned_quantity,
      unique_items: new Set([...scanEntries.map(e => e.item_number), data.item_number]).size,
      unique_pos: new Set([...scanEntries.map(e => e.po_number), data.po_number]).size,
    }));
  };

  useEffect(() => {
    // Socket connection for live updates
    const socket = getSocket();

    // Listen for inbound scan events
    socket.on('inbound:new-scan', (data: ItemScanEntry) => {
      console.log('📦 Live item scan received:', data);
      addScanEntry(data);
    });

    // Listen for location tracker events
    socket.on('location-tracker:new-activity', (data: any) => {
      console.log('📍 Live location tracker activity received:', data);
      // You can add location tracker entries here if needed
    });

    setLoading(false);

    return () => {
      socket.off('inbound:new-scan');
      socket.off('location-tracker:new-activity');
    };
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeVariant = (status: 'in' | 'out') => {
    return status === 'in' ? 'default' : 'secondary';
  };

  const getStatusIcon = (status: 'in' | 'out') => {
    return status === 'in' ? 
      <ArrowUp className="h-4 w-4 text-green-600" /> : 
      <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Item Scan Dashboard
          </CardTitle>
          <CardDescription>Connecting to live feed...</CardDescription>
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
              <Activity className="h-5 w-5" />
              Live Item Scan Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? 'Live Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Real-time item scanning activity and progress tracking
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Scan Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_scans}</div>
            <p className="text-xs text-muted-foreground">RFID scans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Scanned</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total_items_scanned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total quantity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
            <Hash className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.unique_items}</div>
            <p className="text-xs text-muted-foreground">Different items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <Building2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unique_pos}</div>
            <p className="text-xs text-muted-foreground">Active POs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{scanEntries.length}</div>
            <p className="text-xs text-muted-foreground">Recent scans</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Scan Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Live Scan Activity
          </CardTitle>
          <CardDescription>
            Real-time item scanning entries - each scan shows individual item progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Scanned</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>EPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanEntries.map((entry, index) => (
                  <TableRow 
                    key={entry.id} 
                    className={`${index === 0 ? 'bg-green-50 animate-pulse' : ''} ${index < 5 ? 'bg-blue-50' : ''}`}
                  >
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{formatTime(entry.timestamp)}</p>
                        <p className="text-xs text-gray-500">{formatDate(entry.timestamp)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-blue-600 font-medium">
                      {entry.po_number}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">
                      {entry.item_number}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={entry.item_description}>
                        {entry.item_description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-600">
                      {entry.ordered_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {entry.received_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      +{entry.scanned_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      {entry.remaining_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(entry.location_status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(entry.location_status)}
                        {entry.location_status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {entry.location_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {entry.epc.substring(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <Activity className="h-8 w-8 text-gray-400" />
                <p>No scan activity yet</p>
                <p className="text-sm">Item scans will appear here in real-time</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

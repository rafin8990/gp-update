"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Clock, CheckCircle, AlertCircle, XCircle, Activity } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface LivePOStatusDashboardProps {
  isConnected: boolean;
}

interface POStatusData {
  po_number: string;
  status: 'pending' | 'partial' | 'received' | 'cancelled';
  total_ordered_quantity: number;
  total_received_quantity: number;
  total_items: number;
  created_at: string;
  received_at?: string;
}

interface POStatusUpdate {
  po_number: string;
  old_status: string;
  new_status: string;
  received_at?: string;
  total_ordered: number;
  total_received: number;
  timestamp: string;
}

export function LivePOStatusDashboard({ isConnected }: LivePOStatusDashboardProps) {
  const [poStatuses, setPoStatuses] = useState<POStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_pos: 0,
    pending_pos: 0,
    partial_pos: 0,
    received_pos: 0,
    cancelled_pos: 0,
  });

  // Fetch PO status data
  const fetchPOStatusData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/v1/purchase-orders?limit=10&sortBy=created_at&sortOrder=desc');
      const result = await response.json();
      
      if (result.success) {
        const poData = result.data || [];
        setPoStatuses(poData);
        
        // Calculate stats
        const statusCounts = poData.reduce((acc: any, po: any) => {
          acc.total_pos++;
          const status = po.status || 'pending';
          acc[`${status}_pos`]++;
          return acc;
        }, {
          total_pos: 0,
          pending_pos: 0,
          partial_pos: 0,
          received_pos: 0,
          cancelled_pos: 0,
        });
        
        setStats(statusCounts);
      }
    } catch (error) {
      console.error('Failed to fetch PO status data:', error);
      // Set default values on error
      setPoStatuses([]);
      setStats({
        total_pos: 0,
        pending_pos: 0,
        partial_pos: 0,
        received_pos: 0,
        cancelled_pos: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOStatusData();
  }, []);

  // Socket connection for live updates
  useEffect(() => {
    const socket = getSocket();

    // Listen for PO status updates
    socket.on('po:status-updated', (data: POStatusUpdate) => {
      console.log('📋 Live PO status update received:', data);
      fetchPOStatusData(); // Refresh data
    });

    return () => {
      socket.off('po:status-updated');
    };
  }, []);

  const getStatusBadgeVariant = (status: string | undefined) => {
    if (!status) return 'outline';
    
    switch (status) {
      case 'received':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return <Clock className="h-4 w-4 text-gray-600" />;
    
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProgressPercentage = (ordered: number, received: number) => {
    if (ordered === 0) return 0;
    return Math.min((received / ordered) * 100, 100);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Live PO Status Dashboard
          </CardTitle>
          <CardDescription>Loading PO status data...</CardDescription>
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
      {/* PO Status Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_pos}</div>
            <p className="text-xs text-muted-foreground">Purchase Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending_pos}</div>
            <p className="text-xs text-muted-foreground">Awaiting items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.partial_pos}</div>
            <p className="text-xs text-muted-foreground">Partially received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.received_pos}</div>
            <p className="text-xs text-muted-foreground">Fully received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled_pos}</div>
            <p className="text-xs text-muted-foreground">Cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent PO Status Updates */}
      {poStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Purchase Orders
            </CardTitle>
            <CardDescription>
              Latest PO status updates and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poStatuses.slice(0, 10).map((po, index) => {
                  const progressPercentage = getProgressPercentage(
                    po.total_ordered_quantity || 0, 
                    po.total_received_quantity || 0
                  );
                  return (
                    <TableRow key={po.po_number || `po-${index}`} className={index === 0 ? 'bg-green-50' : ''}>
                      <TableCell className="font-mono text-sm">{po.po_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(po.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(po.status)}
                          {(po.status || 'pending').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {(po.total_received_quantity || 0).toLocaleString()} / {(po.total_ordered_quantity || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{po.total_items || 0}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{po.created_at ? formatTime(po.created_at) : 'N/A'}</p>
                          <p className="text-xs text-gray-500">{po.created_at ? formatDate(po.created_at) : 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {po.received_at ? (
                          <div className="text-sm">
                            <p className="font-medium">{formatTime(po.received_at)}</p>
                            <p className="text-xs text-gray-500">{formatDate(po.received_at)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not received</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

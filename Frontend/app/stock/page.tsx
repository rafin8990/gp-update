"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Search, RefreshCw, Package, TrendingUp, Hash, Building2, Activity, MapPin, Clock, User, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stockApi, IStock, IStockFilters, IStockStats, IStockSummary } from '@/lib/api/stock';
import { io } from 'socket.io-client';

export default function StockPage() {
  const [stocks, setStocks] = useState<IStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState<IStockFilters>({
    searchTerm: '',
  });
  const [stats, setStats] = useState<IStockStats | null>(null);
  const [filteredStocks, setFilteredStocks] = useState<IStock[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<{[key: string]: any}>({});
  const [nextFifoLot, setNextFifoLot] = useState<{[key: string]: string}>({});
  const [locationUpdates, setLocationUpdates] = useState<{[key: string]: any}>({});
  const { toast } = useToast();

  // Fetch stocks
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await stockApi.getStocks(filters);
      setStocks(response.data);
      applyFilters(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await stockApi.getStockStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Apply filters to stock data
  const applyFilters = (data: IStock[]) => {
    let filtered = [...data];
    console.log('🔍 Applying filters to stock data:', { originalCount: data.length, filters });

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.item_number.toLowerCase().includes(searchTerm) ||
        (item.item_description && item.item_description.toLowerCase().includes(searchTerm)) ||
        item.lot_no.toLowerCase().includes(searchTerm) ||
        item.po_number.toLowerCase().includes(searchTerm)
      );
      console.log('🔍 After search filter:', { count: filtered.length, searchTerm });
    }

    // Apply item number filter
    if (filters.item_number) {
      filtered = filtered.filter(item => 
        item.item_number.toLowerCase().includes(filters.item_number!.toLowerCase())
      );
      console.log('🔍 After item number filter:', { count: filtered.length, itemNumber: filters.item_number });
    }

    // Apply lot number filter
    if (filters.lot_no) {
      filtered = filtered.filter(item => 
        item.lot_no.toLowerCase().includes(filters.lot_no!.toLowerCase())
      );
      console.log('🔍 After lot number filter:', { count: filtered.length, lotNo: filters.lot_no });
    }

    // Apply PO number filter
    if (filters.po_number) {
      filtered = filtered.filter(item => 
        item.po_number.toLowerCase().includes(filters.po_number!.toLowerCase())
      );
      console.log('🔍 After PO number filter:', { count: filtered.length, poNumber: filters.po_number });
    }

    console.log('🔍 Final filtered data:', { count: filtered.length, items: filtered.slice(0, 3) });
    setFilteredStocks(filtered);
    
    // Calculate total items for pagination (including headers)
    const grouped = getGroupedStockItems();
    let totalItems = 0;
    Object.keys(grouped).forEach(poNumber => {
      Object.keys(grouped[poNumber]).forEach(lotNumber => {
        totalItems += 2; // PO-Lot header + column headers
        totalItems += grouped[poNumber][lotNumber].length; // Items
      });
    });
    
    // Update pagination
    const totalPages = Math.ceil(totalItems / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: totalItems,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    }));
  };

  useEffect(() => {
    fetchStocks();
    fetchStats();
  }, []);

  // Web socket integration for live updates
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    
    // Listen for stock updates
    socket.on('stock_updated', (data: any) => {
      console.log('📦 Live stock update received:', data);
      setLiveUpdates(prev => ({
        ...prev,
        [data.item_number]: {
          ...data,
          timestamp: Date.now()
        }
      }));
      
      // Refresh stock data
      fetchStocks();
    });

    // Listen for inbound updates (new items added)
    socket.on('inbound_updated', (data: any) => {
      console.log('📥 Live inbound update received:', data);
      fetchStocks();
      fetchStats();
    });

    // Listen for location tracker updates
    socket.on('location_tracker_updated', (data: any) => {
      console.log('📍 Live location update received:', data);
      
      // Update location data for specific item
      setLocationUpdates(prev => ({
        ...prev,
        [data.item_number]: {
          ...data,
          timestamp: Date.now()
        }
      }));
      
      // Refresh stock data to get updated location info
      fetchStocks();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (stocks.length > 0) {
      applyFilters(stocks);
    }
  }, [filters]);


  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Group stock items by PO number and Lot number
  const getGroupedStockItems = () => {
    const grouped: { [poNumber: string]: { [lotNumber: string]: IStock[] } } = {};
    
    filteredStocks.forEach(item => {
      if (!grouped[item.po_number]) {
        grouped[item.po_number] = {};
      }
      if (!grouped[item.po_number][item.lot_no]) {
        grouped[item.po_number][item.lot_no] = [];
      }
      grouped[item.po_number][item.lot_no].push(item);
    });
    
    return grouped;
  };

  // Calculate next FIFO lot for each item
  const calculateNextFifoLot = () => {
    const grouped = getGroupedStockItems();
    const nextLots: {[key: string]: string} = {};
    
    Object.keys(grouped).forEach(poNumber => {
      Object.keys(grouped[poNumber]).forEach(lotNumber => {
        const items = grouped[poNumber][lotNumber];
        if (items.length > 0) {
          // Filter out items with quantity 0
          const availableItems = items.filter(item => item.quantity > 0);
          
          if (availableItems.length > 0) {
            // Sort by created_at (FIFO - oldest first)
            const sortedItems = availableItems.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // Get the oldest item's lot number
            const oldestLot = sortedItems[0].lot_no;
            const itemKey = `${poNumber}-${oldestLot}`;
            nextLots[itemKey] = oldestLot;
          }
        }
      });
    });
    
    setNextFifoLot(nextLots);
  };

  // Update FIFO calculation when stocks change
  useEffect(() => {
    if (filteredStocks.length > 0) {
      calculateNextFifoLot();
    }
  }, [filteredStocks]);

  // Auto-clear location updates after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLocationUpdates(prev => {
        const now = Date.now();
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (now - updated[key].timestamp > 10000) { // 10 seconds
            delete updated[key];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get paginated grouped stock items
  const getPaginatedGroupedItems = () => {
    const grouped = getGroupedStockItems();
    const allItems: any[] = [];
    
    // Sort PO numbers first
    const sortedPoNumbers = Object.keys(grouped).sort();
    
    sortedPoNumbers.forEach(poNumber => {
      // Sort lot numbers for each PO
      const sortedLotNumbers = Object.keys(grouped[poNumber]).sort();
      
      sortedLotNumbers.forEach(lotNumber => {
        const items = grouped[poNumber][lotNumber];
        
        // Separate items with stock and out of stock
        const itemsWithStock = items.filter(item => item.quantity > 0);
        const outOfStockItems = items.filter(item => item.quantity === 0);
        
        // Sort items with stock by created_at (FIFO)
        const sortedItemsWithStock = itemsWithStock.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Sort out of stock items by created_at (FIFO)
        const sortedOutOfStockItems = outOfStockItems.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Add header only if there are items
        if (items.length > 0) {
          allItems.push({ 
            type: 'po-lot-header', 
            poNumber, 
            lotNumber, 
            isHeader: true,
            hasStock: itemsWithStock.length > 0,
            outOfStock: outOfStockItems.length > 0
          });
        }
        
        // Add items with stock first
        sortedItemsWithStock.forEach(item => {
          allItems.push({ type: 'item', ...item, isHeader: false, isOutOfStock: false });
        });
        
        // Add out of stock items after
        sortedOutOfStockItems.forEach(item => {
          allItems.push({ type: 'item', ...item, isHeader: false, isOutOfStock: true });
        });
      });
    });
    
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return allItems.slice(startIndex, endIndex);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    // Convert to Bangladesh time (UTC+6)
    const bangladeshTime = new Date(date.getTime() + (6 * 60 * 60 * 1000));
    return bangladeshTime.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    // Convert to Bangladesh time (UTC+6)
    const bangladeshTime = new Date(date.getTime() + (6 * 60 * 60 * 1000));
    return bangladeshTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <PageLayout activePage="stock">
      <div className="space-y-6">
        <PageHeader
          title="Stock Management - Aggregated by Item & Lot"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stock", href: "/stock" }
          ]}
        />

        {/* Live Status Indicator */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Live Stock & Location Monitoring Active</span>
          </div>
          <div className="text-xs text-gray-500">
            FIFO-based consumption & real-time location tracking enabled
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* Item Summary Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search items by ID or description..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Input
                  placeholder="Item Number"
                  value={filters.item_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, item_number: e.target.value }))}
                  className="w-[150px]"
                />
                <Input
                  placeholder="Lot Number"
                  value={filters.lot_no || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, lot_no: e.target.value }))}
                  className="w-[150px]"
                />
                <Input
                  placeholder="PO Number"
                  value={filters.po_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, po_number: e.target.value }))}
                  className="w-[150px]"
                />
              </div>
              <Button onClick={() => { fetchStocks(); fetchStats(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading stock data...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableBody>
                    {getPaginatedGroupedItems().length > 0 ? (
                      getPaginatedGroupedItems().map((row, index) => {
                        if (row.type === 'po-lot-header') {
                          return (
                            <>
                              <TableRow key={`po-lot-${row.poNumber}-${row.lotNumber}`} className={`border-b-2 py-4 px-4 ${
                                row.hasStock && row.outOfStock ? 'bg-green-50 border-green-200' :
                                row.hasStock ? 'bg-green-100 border-green-300' :
                                'bg-red-100 border-red-300'
                              }`}>
                                <TableCell colSpan={6} className="font-bold text-gray-800 text-lg py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <span>📦 {row.poNumber} (Lot: {row.lotNumber})</span>
                                    {row.hasStock && row.outOfStock && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        PARTIAL STOCK
                                      </span>
                                    )}
                                    {row.hasStock && !row.outOfStock && (
                                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                        IN STOCK
                                      </span>
                                    )}
                                    {!row.hasStock && row.outOfStock && (
                                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                                        OUT OF STOCK
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow key={`headers-${row.poNumber}-${row.lotNumber}`} className="bg-blue-50 border-b border-gray-200">
                                <TableHead className="text-blue-800 font-semibold py-2 px-4">Item ID</TableHead>
                                <TableHead className="text-blue-800 font-semibold py-2 px-4">Item Description</TableHead>
                                <TableHead className="text-blue-800 font-semibold py-2 px-4 text-right">Quantity</TableHead>
                                <TableHead className="text-blue-800 font-semibold py-2 px-4">Last Location</TableHead>
                                <TableHead className="text-blue-800 font-semibold py-2 px-4">Created At</TableHead>
                                <TableHead className="text-blue-800 font-semibold py-2 px-4">Updated At</TableHead>
                              </TableRow>
                            </>
                          );
                        }
                        
                        // Regular item row
                        const itemKey = `${row.po_number}-${row.lot_no}`;
                        const isNextFifo = nextFifoLot[itemKey] === row.lot_no;
                        const hasLiveUpdate = liveUpdates[row.item_number];
                        const hasLocationUpdate = locationUpdates[row.item_number];
                        const isOutOfStock = row.quantity === 0;
                        
                        return (
                          <TableRow key={row.id} className={`hover:bg-gray-50 border-l-8 border-l-transparent hover:border-l-blue-400 transition-all ${
                            isNextFifo ? 'bg-green-50 border-l-green-300' : ''
                          } ${hasLiveUpdate ? 'bg-green-50' : ''} ${
                            isOutOfStock ? 'bg-red-50 border-l-red-400 opacity-60' : ''
                          }`}>
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="font-mono text-sm font-semibold text-gray-800">
                                  {row.item_number}
                                </div>
                                {isNextFifo && (
                                  <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    <Zap className="h-3 w-3" />
                                    <span className="font-medium">NEXT FIFO</span>
                                  </div>
                                )}
                                {hasLiveUpdate && (
                                  <div className="flex items-center gap-1 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                    <Activity className="h-3 w-3" />
                                    <span className="font-medium">LIVE</span>
                                  </div>
                                )}
                                {isOutOfStock && (
                                  <div className="flex items-center gap-1 text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                                    <Package className="h-3 w-3" />
                                    <span className="font-medium">OUT OF STOCK</span>
                                  </div>
                                )}
                              </div>
                          </TableCell>
                            <TableCell className="py-3 px-4 max-w-xs">
                              <div className="truncate text-sm text-gray-700" title={row.item_description}>
                                {row.item_description || 'N/A'}
                            </div>
                          </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className={`font-semibold text-lg ${
                                  isOutOfStock ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {row.quantity.toLocaleString()}
                                </div>
                                {hasLiveUpdate && !isOutOfStock && (
                                  <div className="text-xs text-green-600 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>Updated {Math.floor((Date.now() - hasLiveUpdate.timestamp) / 1000)}s ago</span>
                                  </div>
                                )}
                                {isOutOfStock && (
                                  <div className="text-xs text-red-600 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>No stock available</span>
                                  </div>
                                )}
                              </div>
                          </TableCell>
                            <TableCell className="py-3 px-4">
                              {row.last_location_status ? (
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    row.last_location_status === 'in' ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <div className="text-sm">
                                    <div className={`font-medium ${
                                      row.last_location_status === 'in' ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {row.last_location_status === 'in' ? 'IN' : 'OUT'}
                                    </div>
                                    {row.last_location_name && (
                                      <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {row.last_location_name}
                                      </div>
                                    )}
                                    {row.last_location_time && (
                                      <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(row.last_location_time)}
                                      </div>
                                    )}
                                    {hasLocationUpdate && (
                                      <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span>Updated {Math.floor((Date.now() - hasLocationUpdate.timestamp) / 1000)}s ago</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  No location data
                                </div>
                              )}
                          </TableCell>
                            <TableCell className="py-3 px-4">
                            <div className="text-sm">
                                <p className="font-medium text-gray-800">{formatTime(row.created_at)}</p>
                                <p className="text-xs text-gray-500">{formatDate(row.created_at)}</p>
                            </div>
                          </TableCell>
                            <TableCell className="py-3 px-4">
                            <div className="text-sm">
                                <p className="font-medium text-gray-800">{formatTime(row.updated_at)}</p>
                                <p className="text-xs text-gray-500">{formatDate(row.updated_at)}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-gray-400" />
                            <p>No stock data available</p>
                            <p className="text-sm">Items will appear here once they are scanned and added to stock</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Items per page selector */}
                <div className="mt-4 flex justify-end items-center gap-2 text-sm text-gray-600">
                  <span>Items per page:</span>
                  <Select 
                    value={pagination.limit.toString()} 
                    onValueChange={(value) => {
                      setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </PageLayout>
  );
}

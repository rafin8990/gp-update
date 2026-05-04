"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye, DollarSign, Calendar, Building2, User, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { purchaseOrdersApi, PurchaseOrderQueryParams } from '@/lib/api/purchase-orders';
import { IPurchaseOrder } from '@/lib/api/purchase-orders.types';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<IPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<IPurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPurchaseOrders();
  }, [searchTerm, statusFilter, currentPage]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const filters: PurchaseOrderQueryParams = {
        po_number: searchTerm || undefined,
        status_code: statusFilter !== 'all' ? statusFilter : undefined,
        limit: itemsPerPage,
        offset: offset,
      };

      const response = await purchaseOrdersApi.getAll(filters);
      
      setPurchaseOrders(response.data);
      if (response.meta) {
        const calculatedPages = Math.ceil((response.meta.total || 0) / itemsPerPage);
        setTotalPages(calculatedPages || 1);
        setTotalItems(response.meta.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPurchaseOrder?.po_header_id) return;

    try {
      setDeleteLoading(true);
      await purchaseOrdersApi.delete(selectedPurchaseOrder.po_header_id);
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
      setSelectedPurchaseOrder(null);
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';
    const currencyCode = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'full_received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_received':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'full_received':
        return 'Fully Received';
      case 'partially_received':
        return 'Partially Received';
      case 'pending':
        return 'Pending';
      default:
        return status || 'Unknown';
    }
  };

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title="Purchase Orders"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" }
          ]}
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="search">Search</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search"
                    placeholder="Search by PO number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchPurchaseOrders()}
                  />
                  <Button onClick={fetchPurchaseOrders}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-40">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_received">Partially Received</SelectItem>
                      <SelectItem value="full_received">Fully Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCurrentPage(1); fetchPurchaseOrders(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => router.push('/purchase-orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders ({totalItems})</CardTitle>
            <CardDescription>
              Manage your purchase orders and track their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No purchase orders found</p>
                <p className="text-sm mb-4">Create your first purchase order to get started.</p>
                <Button onClick={() => router.push('/purchase-orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.po_header_id} className="hover:bg-gray-50">
                        <TableCell className="font-medium font-mono">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            {po.po_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{po.supplier_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{po.buyer_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(po.order_status)}>
                            {getStatusLabel(po.order_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">
                              {formatCurrency(po.total_amount, po.currency_code)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>{formatDate(po.order_date || po.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/purchase-orders/${po.po_header_id}`)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/purchase-orders/${po.po_header_id}/edit`)}
                              title="Edit purchase order"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setSelectedPurchaseOrder(po)}
                                  title="Delete purchase order"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete PO "{po.po_number}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

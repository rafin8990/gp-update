"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  FileText, 
  Calendar,
  User,
  Building2,
  Boxes,
  Scale,
  Layers,
  Receipt,
  CreditCard,
  MapPin,
  Hash,
  CheckCircle2,
  XCircle,
  Info,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { purchaseOrdersApi, IPoLotReceiveSummaryRow } from '@/lib/api/purchase-orders';
import { IPurchaseOrder, IPurchaseOrderLine } from '@/lib/api/purchase-orders.types';
import { inboundApi, InboundPoSummaryItem } from '@/lib/api/inbound';

export default function PurchaseOrderViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<IPurchaseOrder | null>(null);
  const [lines, setLines] = useState<IPurchaseOrderLine[]>([]);
  const [poInboundSummary, setPoInboundSummary] = useState<InboundPoSummaryItem[]>([]);
  const [lotReceiveSummary, setLotReceiveSummary] = useState<IPoLotReceiveSummaryRow[]>([]);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder();
    }
  }, [params.id]);

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const poId = Number(params.id);
      const [data, inboundSummary, lotSummary] = await Promise.all([
        purchaseOrdersApi.getById(poId),
        inboundApi.getPoSummary(poId).catch(() => []),
        purchaseOrdersApi.getLotReceiveSummary(poId).catch(() => []),
      ]);
      setPo(data.po);
      setLines(data.lines || []);
      setPoInboundSummary(inboundSummary);
      setLotReceiveSummary(lotSummary);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase order",
        variant: "destructive"
      });
      router.push('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!po?.po_header_id) return;

    try {
      setDeleteLoading(true);
      await purchaseOrdersApi.delete(po.po_header_id);
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
      router.push('/purchase-orders');
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

  const handleApproveLot = async (row: IPoLotReceiveSummaryRow) => {
    if (!po?.po_header_id || !row.can_approve) return;
    const key = String(row.po_lot_detail_id);
    try {
      setApprovingKey(key);
      await purchaseOrdersApi.approveLotReceive(po.po_header_id, {
        po_lot_detail_id: row.po_lot_detail_id,
      });
      toast({
        title: 'Success',
        description: `Lot ${row.lot_number} approved to stock`,
      });
      const refreshed = await purchaseOrdersApi.getLotReceiveSummary(po.po_header_id);
      setLotReceiveSummary(refreshed);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve lot receive',
        variant: 'destructive',
      });
    } finally {
      setApprovingKey(null);
    }
  };

  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  /** Received serial range from inbound scans + total qty (same line). */
  const formatReceivedSerialRange = (s: InboundPoSummaryItem) => {
    const qty = s.received_quantity;
    if (qty <= 0) return '—';
    const a = s.serial_start?.toString().trim() || '';
    const b = s.serial_end?.toString().trim() || '';
    if (!a && !b) {
      return `${qty} received (no serial range)`;
    }
    if (a && b && a !== b) {
      return `${a}–${b} (${qty} total)`;
    }
    const single = a || b;
    return `${single} (${qty} total)`;
  };

  const InfoField = ({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: any }) => {
    if (value === null || value === undefined || value === '') return null;
    
    return (
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!po) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold text-gray-900">Purchase Order Not Found</h2>
          <p className="text-gray-600 mt-2">The purchase order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/purchase-orders')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </PageLayout>
    );
  }

  const totalLineAmount = lines.reduce((sum, line) => sum + parseFloat(line.line_amount || '0'), 0);
  const totalTaxAmount = lines.reduce((sum, line) => sum + parseFloat(line.tax_amount || '0'), 0);
  const totalAmount = lines.reduce((sum, line) => sum + parseFloat(line.total_amount || '0'), 0);

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Purchase Order: ${po.po_number}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" },
            { label: po.po_number, href: `/purchase-orders/${po.po_header_id}` }
          ]}
        />

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/purchase-orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/purchase-orders/${po.po_header_id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {po.po_number}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {po.status_name || 'Purchase Order Details'}
              </CardDescription>
            </div>
            <Badge className={`text-sm ${getStatusColor(po.order_status)}`}>
              {getStatusLabel(po.order_status)}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="lines">Line Items</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Supplier Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoField label="Supplier Name" value={po.supplier_name} icon={Building2} />
                      <InfoField label="Supplier ID" value={po.supplier_id} icon={Hash} />
                      <InfoField label="Supplier Site Code" value={po.supplier_site_code} icon={Tag} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Buyer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoField label="Buyer Name" value={po.buyer_name} icon={User} />
                      <InfoField label="Buyer ID" value={po.buyer_id} icon={Hash} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Procurement BU
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoField label="Procurement BU Name" value={po.procurement_bu_name} icon={Building2} />
                      <InfoField label="Procurement BU ID" value={po.procurement_bu_id} icon={Hash} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Dates & Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <InfoField label="Order Date" value={formatDate(po.order_date)} icon={Calendar} />
                      <InfoField label="Created At" value={formatDate(po.created_at)} icon={Calendar} />
                      <InfoField label="Updated At" value={formatDate(po.updated_at)} icon={Calendar} />
                      <InfoField label="Status Code" value={po.status_code} icon={Info} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="lines" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Purchase Order Lines ({lines.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {poInboundSummary.length > 0 && (
                      <div className="mb-6 rounded-md border p-4">
                        <h3 className="mb-3 text-sm font-semibold">
                          Live Received vs Ordered
                        </h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Line</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Ordered</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Received serial (range and total)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {poInboundSummary.map(summary => (
                                <TableRow key={`${summary.po_line_id}-${summary.item_id}`}>
                                  <TableCell>{summary.line_number ?? '-'}</TableCell>
                                  <TableCell className="font-medium">
                                    {summary.item_number}
                                  </TableCell>
                                  <TableCell>{summary.ordered_quantity}</TableCell>
                                  <TableCell className="text-primary font-semibold">
                                    {summary.received_quantity}
                                  </TableCell>
                                  <TableCell>{summary.remaining_quantity}</TableCell>
                                  <TableCell>{summary.progress_percent}%</TableCell>
                                  <TableCell className="text-sm tabular-nums">
                                    {formatReceivedSerialRange(summary)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    <div className="mb-6 rounded-md border p-4">
                      <h3 className="mb-3 text-sm font-semibold">
                        Lot receive (vendor receipt → stock)
                      </h3>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Scanned quantities are allocated to lots by FIFO against receipt lines. Approve
                        each lot once to post to stock.
                      </p>
                      {lotReceiveSummary.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No vendor receipt lot lines found for this PO. Add lines via PO transaction
                          receipt.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Interface line</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Lot</TableHead>
                                <TableHead>Receipt qty</TableHead>
                                <TableHead>Allocated scan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lotReceiveSummary.map(row => (
                                <TableRow key={row.po_lot_detail_id}>
                                  <TableCell className="font-mono text-xs">
                                    {row.interface_line_number}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{row.item_id}</div>
                                    <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                                      {row.item_description ?? '—'}
                                    </div>
                                  </TableCell>
                                  <TableCell>{row.lot_number}</TableCell>
                                  <TableCell>{row.ordered_quantity}</TableCell>
                                  <TableCell className="font-semibold text-primary">
                                    {row.allocated_scanned_quantity}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        row.approval_status === 'received' ? 'default' : 'secondary'
                                      }
                                    >
                                      {row.approval_status === 'received' ? 'Received' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.can_approve ? (
                                      <Button
                                        size="sm"
                                        disabled={approvingKey === String(row.po_lot_detail_id)}
                                        onClick={() => handleApproveLot(row)}
                                      >
                                        Approve
                                      </Button>
                                    ) : row.approval_status === 'received' ? (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        No scan allocated
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                    {lines.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No line items found for this purchase order.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Line #</TableHead>
                              <TableHead>Item Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>UOM</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Line Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line) => (
                              <TableRow key={line.po_line_id}>
                                <TableCell className="font-medium">{line.line_number}</TableCell>
                                <TableCell className="font-mono">{line.item_code || '-'}</TableCell>
                                <TableCell className="max-w-xs truncate">{line.item_description || '-'}</TableCell>
                                <TableCell>{line.category_code || '-'}</TableCell>
                                <TableCell>{line.quantity || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Scale className="h-3 w-3 text-gray-400" />
                                    {line.uom_code || '-'}
                                  </div>
                                </TableCell>
                                <TableCell>{formatCurrency(line.unit_price, line.currency_code)}</TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(line.line_amount, line.currency_code)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getStatusColor(line.line_status_code)}>
                                    {line.line_status_name || line.line_status_code}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Ordered Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(po.ordered_amount, po.currency_code)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Tax Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(po.tax_amount, po.currency_code)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Total Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(po.total_amount, po.currency_code)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Line Items Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Line Amount:</span>
                        <span className="font-medium">{formatCurrency(totalLineAmount, po.currency_code)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Tax:</span>
                        <span className="font-medium">{formatCurrency(totalTaxAmount, po.currency_code)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Grand Total:</span>
                        <span className="text-lg font-bold">{formatCurrency(totalAmount, po.currency_code)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InfoField label="Ship To Location Code" value={po.ship_to_location_code} icon={MapPin} />
                    <InfoField label="Ship To Location ID" value={po.ship_to_location_id} icon={Hash} />
                    {po.ship_to_address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-600">Ship To Address</p>
                          <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-line">{po.ship_to_address}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoField label="Currency Code" value={po.currency_code} icon={DollarSign} />
                    <InfoField label="Source System" value={po.source_system} icon={Info} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

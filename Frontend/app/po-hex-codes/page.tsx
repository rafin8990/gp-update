"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, RefreshCw, Package, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { poCodesApi, IPoCode } from '@/lib/api/po-codes';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { IPurchaseOrder, IPurchaseOrderLine } from '@/lib/api/purchase-orders.types';
import { PageHeader } from '@/components/layout/page-header';

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const FormSection = ({ title, description, children }: FormSectionProps) => (
  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2">
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
);

export default function PoHexCodesPage() {
  const [poCodes, setPoCodes] = useState<IPoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    po_header_id: '',
    item_id: '',
    serial_start: '',
    serial_end: '',
    quantity: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Dropdown data
  const [availablePOs, setAvailablePOs] = useState<IPurchaseOrder[]>([]);
  const [selectedPOLines, setSelectedPOLines] = useState<IPurchaseOrderLine[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  const { toast } = useToast();
  const router = useRouter();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPoCodes();
    fetchPurchaseOrders();
  }, [currentPage]);

  useEffect(() => {
    if (formData.po_header_id) {
      fetchPOLines(Number(formData.po_header_id));
    } else {
      setSelectedPOLines([]);
    }
  }, [formData.po_header_id]);

  // Auto-calculate quantity from serial range
  useEffect(() => {
    const hasSerialStart = !!formData.serial_start?.trim();
    const hasSerialEnd = !!formData.serial_end?.trim();
    
    if (hasSerialStart && hasSerialEnd) {
      try {
        // Use trimmed values to ensure clean parsing
        const start = BigInt(formData.serial_start.trim());
        const end = BigInt(formData.serial_end.trim());
        
        if (start <= end) {
          // Calculate quantity: end - start + 1 (inclusive range)
          // Keep as BigInt to avoid precision loss, then convert to string
          const calculatedQuantity = end - start + BigInt(1);
          setFormData(prev => ({
            ...prev,
            quantity: calculatedQuantity.toString(),
          }));
        }
      } catch (error) {
        // Invalid numbers, don't update quantity
        console.error('Error calculating quantity from serial range:', error);
      }
    } else if (!hasSerialStart && !hasSerialEnd) {
      // Both serial fields are empty, allow manual entry
      // Don't clear quantity here, let user keep their manual entry
    }
  }, [formData.serial_start, formData.serial_end]);

  const fetchPoCodes = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await poCodesApi.getAll({
        limit: itemsPerPage,
        offset: offset,
        rfid_code: searchTerm || undefined,
      });
      
      setPoCodes(response.data);
      if (response.meta) {
        const calculatedPages = Math.ceil((response.meta.total || 0) / itemsPerPage);
        setTotalPages(calculatedPages || 1);
        setTotalItems(response.meta.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching PO codes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch PO codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoadingDropdowns(true);
      const response = await purchaseOrdersApi.getAll({ limit: 1000 });
      setAvailablePOs(response.data || []);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const fetchPOLines = async (poHeaderId: number) => {
    try {
      const poData = await purchaseOrdersApi.getById(poHeaderId);
      setSelectedPOLines(poData.lines || []);
    } catch (error: any) {
      console.error('Error fetching PO lines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase order lines",
        variant: "destructive"
      });
      setSelectedPOLines([]);
    }
  };

  const handlePOChange = (poHeaderId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      po_header_id: poHeaderId,
      item_id: '', // Reset item when PO changes
      quantity: '', // Reset quantity when PO changes
    }));
  };

  const handleItemChange = (itemId: string) => {
    const selectedLine = selectedPOLines.find(line => line.item_id?.toString() === itemId);
    const hasSerialStart = !!formData.serial_start?.trim();
    const hasSerialEnd = !!formData.serial_end?.trim();
    
    setFormData(prev => ({ 
      ...prev, 
      item_id: itemId,
      // Auto-populate quantity from PO line only if serial numbers are not provided
      // If serial numbers are provided, quantity will be auto-calculated from them
      quantity: (hasSerialStart && hasSerialEnd) 
        ? prev.quantity 
        : (selectedLine?.quantity?.toString() || prev.quantity),
    }));
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.po_header_id) {
        setFormErrors(prev => ({ ...prev, po_header_id: 'Purchase order is required' }));
        return;
      }
      if (!formData.item_id) {
        setFormErrors(prev => ({ ...prev, item_id: 'Item is required' }));
        return;
      }

      // Validate serial numbers if provided
      const hasSerialStart = !!formData.serial_start?.trim();
      const hasSerialEnd = !!formData.serial_end?.trim();

      if (hasSerialStart !== hasSerialEnd) {
        setFormErrors(prev => ({
          ...prev,
          serial_start: 'Provide both serial start and serial end or leave both empty',
          serial_end: 'Provide both serial start and serial end or leave both empty',
        }));
        return;
      }

      let serialStartStr: string | null = null;
      let serialEndStr: string | null = null;

      if (hasSerialStart && hasSerialEnd) {
        const start = BigInt(formData.serial_start);
        const end = BigInt(formData.serial_end);
        
        if (start > end) {
          setFormErrors(prev => ({ 
            ...prev, 
            serial_start: 'Serial start must be less than or equal to serial end' 
          }));
          return;
        }

        // Keep as strings to avoid precision loss for large numbers
        serialStartStr = formData.serial_start;
        serialEndStr = formData.serial_end;
      }

      // Parse quantity: if serial numbers are provided, calculate from them using BigInt; otherwise use manual entry
      let quantityNum: number | null = null;
      if (hasSerialStart && hasSerialEnd) {
        // Calculate quantity from serial range using BigInt to avoid precision loss
        // Use the exact string values from formData to ensure no precision loss
        const start = BigInt(formData.serial_start.trim());
        const end = BigInt(formData.serial_end.trim());
        const calculatedQuantity = end - start + BigInt(1);
        
        // Convert BigInt result to number (quantity should be small enough to fit in safe integer range)
        // If it's too large, we'll still convert but log a warning
        if (calculatedQuantity > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.warn('Quantity exceeds safe integer range, may lose precision');
        }
        quantityNum = Number(calculatedQuantity);
      } else if (formData.quantity?.trim()) {
        // Use manually entered quantity
        const quantity = BigInt(formData.quantity.trim());
        if (quantity < 0) {
          setFormErrors(prev => ({ 
            ...prev, 
            quantity: 'Quantity must be a positive number' 
          }));
          return;
        }
        // Convert to number
        if (quantity > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.warn('Quantity exceeds safe integer range, may lose precision');
        }
        quantityNum = Number(quantity);
      }

      // Create PO code - RFID will be auto-generated
      const payload = {
        po_header_id: Number(formData.po_header_id),
        item_id: Number(formData.item_id),
        serial_start: serialStartStr,
        serial_end: serialEndStr,
        quantity: quantityNum,
      };

      await poCodesApi.create(payload);
      
      toast({
        title: "Success",
        description: "PO code created successfully with auto-generated 16-digit hex RFID code"
      });
      
      resetForm();
      fetchPoCodes();
    } catch (error: any) {
      console.error('Error creating PO code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create PO code",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await poCodesApi.delete(id);
      toast({
        title: "Success",
        description: "PO code deleted successfully"
      });
      fetchPoCodes();
    } catch (error: any) {
      console.error('Error deleting PO code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete PO code",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      po_header_id: '',
      item_id: '',
      serial_start: '',
      serial_end: '',
      quantity: '',
    });
    setFormErrors({});
    setSelectedPOLines([]);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedPO = availablePOs.find(po => po.po_header_id.toString() === formData.po_header_id);
  const selectedLine = selectedPOLines.find(line => line.item_id?.toString() === formData.item_id);

  return (
    <PageLayout activePage="po-hex-codes">
      <div className="space-y-4">
        <PageHeader
          title="PO Codes (RFID)"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "PO Codes", href: "/po-hex-codes" }
          ]}
        />

        {/* Create button to go to dedicated create page */}
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-8 text-sm"
            onClick={() => router.push('/po-hex-codes/create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create PO Code
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="search" className="text-xs">Search by RFID Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search"
                    placeholder="Search RFID codes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchPoCodes()}
                    className="h-8 text-sm"
                  />
                  <Button onClick={fetchPoCodes} size="sm" className="h-8">
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setCurrentPage(1); fetchPoCodes(); }} size="sm" className="h-8 text-sm">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Generated PO Codes ({totalItems})</CardTitle>
            <CardDescription className="text-xs">
              View all generated RFID codes with their associated purchase orders and items
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : poCodes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Hash className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No PO codes found</p>
                <p className="text-sm mb-4">Create your first PO code to get started.</p>
                <Button onClick={() => router.push('/po-hex-codes/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create PO Code
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>RFID Code</TableHead>
                      <TableHead>PO Header ID</TableHead>
                      <TableHead>Item ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Serial Start</TableHead>
                      <TableHead>Serial End</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poCodes.map((poCode, index) => (
                      <TableRow key={poCode.id} className="hover:bg-gray-50">
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-lg tracking-wider">
                          <Badge variant="outline" className="font-mono">
                            {poCode.rfid_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{poCode.po_header_id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span>{poCode.item_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {poCode.quantity ? poCode.quantity.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {poCode.serial_start 
                            ? typeof poCode.serial_start === 'string' 
                              ? poCode.serial_start 
                              : poCode.serial_start.toLocaleString() 
                            : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {poCode.serial_end 
                            ? typeof poCode.serial_end === 'string' 
                              ? poCode.serial_end 
                              : poCode.serial_end.toLocaleString() 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{formatDate(poCode.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/po-hex-codes/${poCode.id}/edit`)}
                              title="Edit PO code"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete PO code"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete PO Code</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete RFID code "{poCode.rfid_code}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(poCode.id)}
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

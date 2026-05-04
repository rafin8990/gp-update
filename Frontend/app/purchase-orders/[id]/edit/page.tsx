"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { itemsApi, IItem } from '@/lib/api/items';
import { IPurchaseOrderWithLines } from '@/lib/api/purchase-orders';

interface IPurchaseOrderLineItem {
  po_line_id?: number;
  line_number: number;
  line_status_code: string;
  line_status_name: string;
  line_type: string;
  item_id: number | null;
  item_code: string;
  item_description: string;
  category_code: string;
  uom_code: string;
  uom_name: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  line_amount: number;
  tax_amount: number;
  total_amount: number;
}

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = useState<IPurchaseOrderWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableItems, setAvailableItems] = useState<IItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [deletedLineIds, setDeletedLineIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    po_number: '',
    status_code: 'APPROVED',
    status_name: '',
    order_status: 'pending' as 'pending' | 'partially_received' | 'full_received',
    procurement_bu_id: '',
    procurement_bu_name: '',
    supplier_id: '',
    supplier_name: '',
    supplier_site_id: '',
    supplier_site_code: '',
    buyer_id: '',
    buyer_name: '',
    ship_to_location_id: '',
    ship_to_location_code: '',
    ship_to_address: '',
    currency_code: '',
    ordered_amount: '',
    tax_amount: '',
    total_amount: '',
    order_date: '',
    source_system: 'oracle_fusion',
  });

  const [purchaseOrderItems, setPurchaseOrderItems] = useState<IPurchaseOrderLineItem[]>([]);

  const poId = params.id as string;

  useEffect(() => {
    if (poId) {
      fetchAvailableItems();
      fetchPurchaseOrder();
    }
  }, [poId]);

  const fetchAvailableItems = async () => {
    try {
      setLoadingItems(true);
      const response = await itemsApi.getAll({ limit: 1000 });
      setAvailableItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available items',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersApi.getById(Number(poId));
      setPurchaseOrder(data);

      setFormData({
        po_number: data.po?.po_number || '',
        status_code: data.po?.status_code || 'APPROVED',
        status_name: data.po?.status_name || '',
        order_status: data.po?.order_status || 'pending',
        procurement_bu_id: data.po?.procurement_bu_id != null ? String(data.po.procurement_bu_id) : '',
        procurement_bu_name: data.po?.procurement_bu_name || '',
        supplier_id: data.po?.supplier_id != null ? String(data.po.supplier_id) : '',
        supplier_name: data.po?.supplier_name || '',
        supplier_site_id: data.po?.supplier_site_id != null ? String(data.po.supplier_site_id) : '',
        supplier_site_code: data.po?.supplier_site_code || '',
        buyer_id: data.po?.buyer_id != null ? String(data.po.buyer_id) : '',
        buyer_name: data.po?.buyer_name || '',
        ship_to_location_id: data.po?.ship_to_location_id != null ? String(data.po.ship_to_location_id) : '',
        ship_to_location_code: data.po?.ship_to_location_code || '',
        ship_to_address: data.po?.ship_to_address || '',
        currency_code: data.po?.currency_code || '',
        ordered_amount: data.po?.ordered_amount != null ? String(data.po.ordered_amount) : '',
        tax_amount: data.po?.tax_amount != null ? String(data.po.tax_amount) : '',
        total_amount: data.po?.total_amount != null ? String(data.po.total_amount) : '',
        order_date: data.po?.order_date ? new Date(data.po.order_date).toISOString().slice(0, 16) : '',
        source_system: data.po?.source_system || 'oracle_fusion',
      });

      const items = (data.lines || []).map(line => {
        const quantityNum = line.quantity != null ? Number(line.quantity) : 1;
        const unitPriceNum = line.unit_price != null ? Number(line.unit_price) : 0;
        const lineAmountNum = line.line_amount != null ? Number(line.line_amount) : quantityNum * unitPriceNum;
        const taxAmountNum = line.tax_amount != null ? Number(line.tax_amount) : 0;

        return {
          po_line_id: line.po_line_id,
          line_number: line.line_number || 1,
          line_status_code: line.line_status_code || 'OPEN',
          line_status_name: line.line_status_name || 'Open',
          line_type: line.line_type || '',
          item_id: line.item_id ?? null,
          item_code: line.item_code || '',
          item_description: line.item_description || '',
          category_code: line.category_code || '',
          uom_code: line.uom_code || '',
          uom_name: line.uom_name || '',
          quantity: quantityNum,
          unit_price: unitPriceNum,
          currency_code: line.currency_code || data.po?.currency_code || '',
          line_amount: lineAmountNum,
          tax_amount: taxAmountNum,
          total_amount: line.total_amount != null ? Number(line.total_amount) : lineAmountNum + taxAmountNum,
        };
      });

      if (items.length === 0) {
        items.push({
          line_number: 1,
          line_status_code: 'OPEN',
          line_status_name: 'Open',
          line_type: '',
          item_id: null,
          item_code: '',
          item_description: '',
          category_code: '',
          uom_code: '',
          uom_name: '',
          quantity: 1,
          unit_price: 0,
          currency_code: data.po?.currency_code || '',
          line_amount: 0,
          tax_amount: 0,
          total_amount: 0,
        });
      }

      setPurchaseOrderItems(items);
      setDeletedLineIds([]);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch purchase order',
        variant: 'destructive'
      });
      router.push('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!purchaseOrder?.po) return;

    try {
      setSaving(true);

      if (!formData.supplier_name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Supplier name is required',
          variant: 'destructive'
        });
        return;
      }

      if (purchaseOrderItems.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'At least one line is required',
          variant: 'destructive'
        });
        return;
      }

      const poHeaderId = purchaseOrder.po.po_header_id;
      const updateLines: Array<Record<string, unknown>> = purchaseOrderItems.map((line, index) => {
        const quantityNum = line.quantity != null ? Number(line.quantity) : null;
        const unitPriceNum = line.unit_price != null ? Number(line.unit_price) : null;
        const lineAmountNum = line.line_amount != null ? Number(line.line_amount) : null;
        const taxAmountNum = line.tax_amount != null ? Number(line.tax_amount) : null;
        const totalAmountNum = line.total_amount != null ? Number(line.total_amount) : null;

        let generatedPoLineId = poHeaderId + index + 1;
        while (purchaseOrderItems.some(existing => existing.po_line_id === generatedPoLineId)) {
          generatedPoLineId += 1;
        }

        return {
          _action: line.po_line_id ? 'update' : 'create',
          po_line_id: line.po_line_id || generatedPoLineId,
          po_header_id: poHeaderId,
          line_number: line.line_number,
          line_status_code: line.line_status_code,
          line_status_name: line.line_status_name || null,
          line_type: line.line_type || null,
          item_id: line.item_id,
          item_code: line.item_code || null,
          item_description: line.item_description || null,
          category_code: line.category_code || null,
          uom_code: line.uom_code || null,
          uom_name: line.uom_name || null,
          quantity: quantityNum,
          unit_price: unitPriceNum,
          currency_code: line.currency_code || formData.currency_code || null,
          line_amount: lineAmountNum,
          tax_amount: taxAmountNum,
          total_amount: totalAmountNum,
        };
      });

      const deleteLines = deletedLineIds.map(poLineId => ({
        _action: 'delete' as const,
        po_line_id: poLineId,
      }));

      const totalOrderedAmount = purchaseOrderItems.reduce(
        (sum, item) => sum + (Number(item.line_amount) || 0),
        0
      );
      const totalTaxAmount = purchaseOrderItems.reduce(
        (sum, item) => sum + (Number(item.tax_amount) || 0),
        0
      );
      const totalAmount = totalOrderedAmount + totalTaxAmount;

      await purchaseOrdersApi.updateWithLines(poHeaderId, {
        po: {
          po_number: formData.po_number,
          status_code: formData.status_code,
          status_name: formData.status_name || null,
          order_status: formData.order_status,
          procurement_bu_id: formData.procurement_bu_id ? Number(formData.procurement_bu_id) : null,
          procurement_bu_name: formData.procurement_bu_name || null,
          supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
          supplier_name: formData.supplier_name || null,
          supplier_site_id: formData.supplier_site_id ? Number(formData.supplier_site_id) : null,
          supplier_site_code: formData.supplier_site_code || null,
          buyer_id: formData.buyer_id ? Number(formData.buyer_id) : null,
          buyer_name: formData.buyer_name || null,
          ship_to_location_id: formData.ship_to_location_id ? Number(formData.ship_to_location_id) : null,
          ship_to_location_code: formData.ship_to_location_code || null,
          ship_to_address: formData.ship_to_address || null,
          currency_code: formData.currency_code || null,
          ordered_amount: formData.ordered_amount ? Number(formData.ordered_amount) : totalOrderedAmount,
          tax_amount: formData.tax_amount ? Number(formData.tax_amount) : totalTaxAmount,
          total_amount: formData.total_amount ? Number(formData.total_amount) : totalAmount,
          order_date: formData.order_date ? new Date(formData.order_date).toISOString() : null,
          source_system: formData.source_system || null,
        },
        lines: [...updateLines, ...deleteLines] as any,
      });

      toast({
        title: 'Success',
        description: 'Purchase order updated successfully'
      });
      router.push(`/purchase-orders/${poHeaderId}`);
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update purchase order',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addPurchaseOrderItem = () => {
    const newLineNumber = purchaseOrderItems.length + 1;
    setPurchaseOrderItems([
      ...purchaseOrderItems,
      {
        line_number: newLineNumber,
        line_status_code: 'OPEN',
        line_status_name: 'Open',
        line_type: '',
        item_id: null,
        item_code: '',
        item_description: '',
        category_code: '',
        uom_code: '',
        uom_name: '',
        quantity: 1,
        unit_price: 0,
        currency_code: formData.currency_code || '',
        line_amount: 0,
        tax_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  const removePurchaseOrderItem = (index: number) => {
    const removedLine = purchaseOrderItems[index];
    if (removedLine?.po_line_id) {
      setDeletedLineIds(prev => [...prev, removedLine.po_line_id!]);
    }

    const updated = purchaseOrderItems.filter((_, i) => i !== index);
    const renumbered = updated.map((item, idx) => ({ ...item, line_number: idx + 1 }));
    setPurchaseOrderItems(renumbered);
  };

  const updatePurchaseOrderItem = (
    index: number,
    field: keyof IPurchaseOrderLineItem,
    value: string | number | null
  ) => {
    const updatedItems = [...purchaseOrderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value } as IPurchaseOrderLineItem;

    if (field === 'quantity' || field === 'unit_price') {
      const item = updatedItems[index];
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      item.line_amount = qty * price;
      item.total_amount = item.line_amount + (Number(item.tax_amount) || 0);
    }

    setPurchaseOrderItems(updatedItems);
  };

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2"></div>
        </div>
      </PageLayout>
    );
  }

  if (!purchaseOrder) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="text-center py-16 text-gray-500">
          Purchase Order not found.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Edit Purchase Order ${purchaseOrder.po?.po_number || ''}`}
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Purchase Orders', href: '/purchase-orders' },
            {
              label: purchaseOrder.po?.po_number || String(purchaseOrder.po?.po_header_id || ''),
              href: `/purchase-orders/${purchaseOrder.po?.po_header_id}`,
            },
            { label: 'Edit', href: `/purchase-orders/${purchaseOrder.po?.po_header_id}/edit` },
          ]}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/purchase-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="po_number">PO Number (Optional)</Label>
                    <Input
                      id="po_number"
                      value={formData.po_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                      placeholder="Leave empty to keep current"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status_code">Status Code *</Label>
                    <Input
                      id="status_code"
                      value={formData.status_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, status_code: e.target.value }))}
                      placeholder="e.g., APPROVED, PENDING"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status_name">Status Name</Label>
                    <Input
                      id="status_name"
                      value={formData.status_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, status_name: e.target.value }))}
                      placeholder="e.g., Standard, Express"
                    />
                  </div>
                  <div>
                    <Label htmlFor="order_status">Order Status</Label>
                    <Select
                      value={formData.order_status}
                      onValueChange={(value: 'pending' | 'partially_received' | 'full_received') =>
                        setFormData(prev => ({ ...prev, order_status: value }))
                      }
                    >
                      <SelectTrigger id="order_status">
                        <SelectValue placeholder="Select order status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partially_received">Partially Received</SelectItem>
                        <SelectItem value="full_received">Full Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="order_date">Order Date</Label>
                    <Input
                      id="order_date"
                      type="datetime-local"
                      value={formData.order_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="source_system">Source System</Label>
                    <Input
                      id="source_system"
                      value={formData.source_system}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_system: e.target.value }))}
                      placeholder="e.g., oracle_fusion"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Supplier & Buyer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier_name">Supplier Name *</Label>
                    <Input
                      id="supplier_name"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                      placeholder="Enter supplier name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_id">Supplier ID</Label>
                    <Input
                      id="supplier_id"
                      type="number"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                      placeholder="Enter supplier ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_site_code">Supplier Site Code</Label>
                    <Input
                      id="supplier_site_code"
                      value={formData.supplier_site_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_site_code: e.target.value }))}
                      placeholder="Enter supplier site code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_site_id">Supplier Site ID</Label>
                    <Input
                      id="supplier_site_id"
                      type="number"
                      value={formData.supplier_site_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_site_id: e.target.value }))}
                      placeholder="Enter supplier site ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyer_name">Buyer Name</Label>
                    <Input
                      id="buyer_name"
                      value={formData.buyer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_name: e.target.value }))}
                      placeholder="Enter buyer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyer_id">Buyer ID</Label>
                    <Input
                      id="buyer_id"
                      type="number"
                      value={formData.buyer_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyer_id: e.target.value }))}
                      placeholder="Enter buyer ID"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Procurement Business Unit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="procurement_bu_name">Procurement BU Name</Label>
                    <Input
                      id="procurement_bu_name"
                      value={formData.procurement_bu_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, procurement_bu_name: e.target.value }))}
                      placeholder="Enter procurement BU name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="procurement_bu_id">Procurement BU ID</Label>
                    <Input
                      id="procurement_bu_id"
                      type="number"
                      value={formData.procurement_bu_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, procurement_bu_id: e.target.value }))}
                      placeholder="Enter procurement BU ID"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ship_to_location_code">Ship To Location Code</Label>
                    <Input
                      id="ship_to_location_code"
                      value={formData.ship_to_location_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, ship_to_location_code: e.target.value }))}
                      placeholder="Enter ship to location code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ship_to_location_id">Ship To Location ID</Label>
                    <Input
                      id="ship_to_location_id"
                      type="number"
                      value={formData.ship_to_location_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, ship_to_location_id: e.target.value }))}
                      placeholder="Enter ship to location ID"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="ship_to_address">Ship To Address</Label>
                    <Textarea
                      id="ship_to_address"
                      value={formData.ship_to_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, ship_to_address: e.target.value }))}
                      placeholder="Enter ship to address"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency_code">Currency Code</Label>
                    <Input
                      id="currency_code"
                      value={formData.currency_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency_code: e.target.value }))}
                      placeholder="e.g., USD, BDT"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ordered_amount">Ordered Amount</Label>
                    <Input
                      id="ordered_amount"
                      type="number"
                      step="0.01"
                      value={formData.ordered_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, ordered_amount: e.target.value }))}
                      placeholder="Enter ordered amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_amount">Tax Amount</Label>
                    <Input
                      id="tax_amount"
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                      placeholder="Enter tax amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                      placeholder="Enter total amount"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Purchase Order Lines *</Label>
                    <p className="text-sm text-gray-500 mt-1">Manage items in this purchase order</p>
                  </div>
                  <Button type="button" onClick={addPurchaseOrderItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                {purchaseOrderItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <p className="mb-2">No items added yet</p>
                    <p className="text-sm">Click "Add Line" to start adding items to this purchase order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseOrderItems.map((item, index) => {
                      const selectedItem = availableItems.find(
                        i => i.item.toString() === item.item_code || (item.item_id && i.item === item.item_id)
                      );

                      return (
                        <Card key={`${item.po_line_id || 'new'}-${index}`} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Line {index + 1}</p>
                                  {selectedItem && (
                                    <p className="text-xs text-gray-500">{selectedItem.description || 'No description'}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePurchaseOrderItem(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`item_${index}`}>Item Code *</Label>
                                  <Select
                                    value={item.item_code || (item.item_id ? item.item_id.toString() : '')}
                                    onValueChange={(value) => {
                                      const selected = availableItems.find(i => i.item.toString() === value);
                                      if (selected) {
                                        const updatedItems = [...purchaseOrderItems];
                                        updatedItems[index] = {
                                          ...updatedItems[index],
                                          item_code: selected.item.toString(),
                                          item_id: selected.item,
                                          item_description: selected.description || '',
                                          uom_code: selected.primary_uom_code || '',
                                          uom_name: selected.primary_uom_name || '',
                                          category_code: selected.item_class || '',
                                        };
                                        setPurchaseOrderItems(updatedItems);
                                      } else {
                                        updatePurchaseOrderItem(index, 'item_code', value);
                                      }
                                    }}
                                  >
                                    <SelectTrigger id={`item_${index}`}>
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {loadingItems ? (
                                        <SelectItem value="loading" disabled>Loading items...</SelectItem>
                                      ) : (
                                        availableItems.map(availableItem => (
                                          <SelectItem key={availableItem.item} value={availableItem.item.toString()}>
                                            {availableItem.item} - {availableItem.description || 'No description'}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor={`item_description_${index}`}>Item Description</Label>
                                  <Input
                                    id={`item_description_${index}`}
                                    value={item.item_description}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'item_description', e.target.value)}
                                    placeholder="Item description"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`category_code_${index}`}>Category Code</Label>
                                  <Input
                                    id={`category_code_${index}`}
                                    value={item.category_code}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'category_code', e.target.value)}
                                    placeholder="Category code"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`line_type_${index}`}>Line Type</Label>
                                  <Input
                                    id={`line_type_${index}`}
                                    value={item.line_type}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'line_type', e.target.value)}
                                    placeholder="Line type"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`line_status_code_${index}`}>Line Status Code *</Label>
                                  <Input
                                    id={`line_status_code_${index}`}
                                    value={item.line_status_code}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'line_status_code', e.target.value)}
                                    placeholder="e.g., OPEN, CLOSED"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`line_status_name_${index}`}>Line Status Name</Label>
                                  <Input
                                    id={`line_status_name_${index}`}
                                    value={item.line_status_name}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'line_status_name', e.target.value)}
                                    placeholder="e.g., Open, Closed"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`quantity_${index}`}>Quantity *</Label>
                                  <Input
                                    id={`quantity_${index}`}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updatePurchaseOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="Enter quantity"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`uom_code_${index}`}>UOM Code</Label>
                                  <Input
                                    id={`uom_code_${index}`}
                                    value={item.uom_code}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'uom_code', e.target.value)}
                                    placeholder="Unit of measure code"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`uom_name_${index}`}>UOM Name</Label>
                                  <Input
                                    id={`uom_name_${index}`}
                                    value={item.uom_name}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'uom_name', e.target.value)}
                                    placeholder="Unit of measure name"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`unit_price_${index}`}>Unit Price</Label>
                                  <Input
                                    id={`unit_price_${index}`}
                                    type="number"
                                    step="0.0001"
                                    value={item.unit_price}
                                    onChange={(e) =>
                                      updatePurchaseOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="Unit price"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`currency_code_${index}`}>Currency Code</Label>
                                  <Input
                                    id={`currency_code_${index}`}
                                    value={item.currency_code || formData.currency_code}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'currency_code', e.target.value)}
                                    placeholder="e.g., USD, BDT"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`line_amount_${index}`}>Line Amount</Label>
                                  <Input
                                    id={`line_amount_${index}`}
                                    type="number"
                                    step="0.01"
                                    value={item.line_amount}
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`tax_amount_${index}`}>Tax Amount</Label>
                                  <Input
                                    id={`tax_amount_${index}`}
                                    type="number"
                                    step="0.01"
                                    value={item.tax_amount}
                                    onChange={(e) => {
                                      const tax = parseFloat(e.target.value) || 0;
                                      updatePurchaseOrderItem(index, 'tax_amount', tax);
                                      const lineAmount = Number(item.line_amount) || 0;
                                      updatePurchaseOrderItem(index, 'total_amount', lineAmount + tax);
                                    }}
                                    placeholder="Tax amount"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`total_amount_${index}`}>Total Amount</Label>
                                  <Input
                                    id={`total_amount_${index}`}
                                    type="number"
                                    step="0.01"
                                    value={item.total_amount}
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {purchaseOrderItems.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Lines</p>
                        <p className="text-2xl font-bold text-blue-600">{purchaseOrderItems.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Quantity</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrderItems
                            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                            .toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Line Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrderItems
                            .reduce((sum, item) => sum + (Number(item.line_amount) || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrderItems
                            .reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => router.push('/purchase-orders')}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || purchaseOrderItems.length === 0}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

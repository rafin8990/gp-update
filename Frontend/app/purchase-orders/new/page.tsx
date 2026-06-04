"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { itemsApi, IItem } from '@/lib/api/items';

// Purchase Order Line Item interface with all fields
interface IPurchaseOrderLineItem {
  // Line identification
  line_number: number;
  line_status_code: string;
  line_status_name: string;
  line_type: string;

  // Item information
  item_id: number | null;
  item_code: string;
  item_description: string;
  category_code: string;

  // UOM
  uom_code: string;
  uom_name: string;

  // Quantity and pricing
  quantity: number;
  unit_price: number;
  currency_code: string;
  line_amount: number;
  tax_amount: number;
  total_amount: number;

}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [createLoading, setCreateLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<IItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Purchase Order Header Form State - All fields from purchase_orders table
  const [formData, setFormData] = useState({
    // Basic
    po_number: '',
    status_code: 'APPROVED',
    status_name: '',
    order_status: 'pending' as 'pending' | 'partially_received' | 'full_received',

    // Procurement BU
    procurement_bu_id: '',
    procurement_bu_name: '',

    // Supplier
    supplier_id: '',
    supplier_name: '',
    supplier_site_id: '',
    supplier_site_code: '',

    // Buyer
    buyer_id: '',
    buyer_name: '',

    // Shipping
    ship_to_location_id: '',
    ship_to_location_code: '',
    ship_to_address: '',

    // Financial
    currency_code: '',
    ordered_amount: '',
    tax_amount: '',
    total_amount: '',

    // Dates
    order_date: '',

    // System
    source_system: 'oracle_fusion',
  });

  // Purchase Order Lines State
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<IPurchaseOrderLineItem[]>([]);

  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      setLoadingItems(true);
      const response = await itemsApi.getAll({ limit: 1000 });
      setAvailableItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available items",
        variant: "destructive"
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);

      // Validation
      if (!formData.supplier_name.trim()) {
        toast({
          title: "Validation Error",
          description: "Supplier name is required",
          variant: "destructive"
        });
        return;
      }

      if (purchaseOrderItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one item is required",
          variant: "destructive"
        });
        return;
      }

      // Validate all items
      for (let i = 0; i < purchaseOrderItems.length; i++) {
        const item = purchaseOrderItems[i];
        if (!item.item_code || !item.quantity || item.quantity <= 0) {
          toast({
            title: "Validation Error",
            description: `Line ${item.line_number}: Item code and quantity (greater than 0) are required`,
            variant: "destructive"
          });
          return;
        }
        if (!item.line_status_code) {
          toast({
            title: "Validation Error",
            description: `Line ${item.line_number}: Line status code is required`,
            variant: "destructive"
          });
          return;
        }
      }

      // Generate po_header_id (using Oracle Fusion ID if available, otherwise timestamp)
      let po_header_id = Date.now();
      if (formData.source_system === 'oracle_fusion' && (window as any).__oracleFusionPOHeaderId) {
        // Use Oracle Fusion POHeaderId directly
        po_header_id = (window as any).__oracleFusionPOHeaderId;
      } else if (formData.po_number && /^\d+$/.test(formData.po_number)) {
        // If PO number is numeric (from Oracle Fusion), use it as base
        po_header_id = parseInt(formData.po_number) * 1000;
      }
      const po_number = formData.po_number || `PO-${po_header_id}`;

      // Create lines with all fields
      const lines = purchaseOrderItems.map((poItem, index) => {
        // Find the item from available items if item_code is provided
        const item = availableItems.find(i =>
          i.item.toString() === poItem.item_code ||
          (poItem.item_id && i.item === poItem.item_id)
        );

        // Use Oracle Fusion POLineId if available (stored when generated from Oracle)
        // Otherwise generate a unique ID
        let po_line_id = po_header_id + index + 1;
        if (formData.source_system === 'oracle_fusion' && (poItem as any)._oraclePOLineId) {
          // Use the stored Oracle Fusion POLineId
          po_line_id = (poItem as any)._oraclePOLineId;
        }

        // Convert numeric fields to numbers (not strings)
        const quantityNum = poItem.quantity != null ? Number(poItem.quantity) : null;
        const unitPriceNum = poItem.unit_price != null ? Number(poItem.unit_price) : null;
        const lineAmountNum = poItem.line_amount != null ? Number(poItem.line_amount) : null;
        const taxAmountNum = poItem.tax_amount != null ? Number(poItem.tax_amount) : null;
        const totalAmountNum = poItem.total_amount != null ? Number(poItem.total_amount) : null;

        // Ensure item_id is always a number or null
        let itemIdNum: number | null = null;
        if (item) {
          itemIdNum = typeof item.item === 'number' ? item.item : Number(item.item);
        } else if (poItem.item_id != null) {
          itemIdNum = typeof poItem.item_id === 'number' ? poItem.item_id : Number(poItem.item_id);
          // If conversion results in NaN, set to null
          if (isNaN(itemIdNum)) {
            itemIdNum = null;
          }
        }

        return {
          po_line_id: po_line_id,
          po_header_id: po_header_id, // Include po_header_id for reference
          line_number: poItem.line_number,
          line_status_code: poItem.line_status_code,
          line_status_name: poItem.line_status_name || null,
          line_type: poItem.line_type || null,
          item_id: itemIdNum,
          item_code: poItem.item_code || null,
          item_description: poItem.item_description || (item?.description || null),
          category_code: poItem.category_code || null,
          uom_code: poItem.uom_code || (item?.primary_uom_code || null),
          uom_name: poItem.uom_name || (item?.primary_uom_name || null),
          quantity: quantityNum,
          unit_price: unitPriceNum,
          currency_code: poItem.currency_code || formData.currency_code || null,
          line_amount: lineAmountNum,
          tax_amount: taxAmountNum,
          total_amount: totalAmountNum,
        };
      });

      // Calculate totals
      const totalOrderedAmount = purchaseOrderItems.reduce((sum, item) => sum + (parseFloat(item.line_amount?.toString() || '0')), 0);
      const totalTaxAmount = purchaseOrderItems.reduce((sum, item) => sum + (parseFloat(item.tax_amount?.toString() || '0')), 0);
      const totalAmount = totalOrderedAmount + totalTaxAmount;

      const purchaseOrderData = {
        po: {
          po_header_id: po_header_id,
          po_number: po_number,
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
          ordered_amount: formData.ordered_amount ? Number(formData.ordered_amount) : (totalOrderedAmount || null),
          tax_amount: formData.tax_amount ? Number(formData.tax_amount) : (totalTaxAmount || null),
          total_amount: formData.total_amount ? Number(formData.total_amount) : (totalAmount || null),
          order_date: formData.order_date || new Date().toISOString(),
          source_system: formData.source_system || 'oracle_fusion',
        },
        lines: lines,
      };

      await purchaseOrdersApi.createWithLines(purchaseOrderData);

      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
      router.push('/purchase-orders');
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const addPurchaseOrderItem = () => {
    const newLineNumber = purchaseOrderItems.length + 1;
    setPurchaseOrderItems([...purchaseOrderItems, {
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
    }]);
  };

  const removePurchaseOrderItem = (index: number) => {
    const updated = purchaseOrderItems.filter((_, i) => i !== index);
    // Re-number the lines
    const renumbered = updated.map((item, idx) => ({
      ...item,
      line_number: idx + 1
    }));
    setPurchaseOrderItems(renumbered);
  };

  const updatePurchaseOrderItem = (index: number, field: keyof IPurchaseOrderLineItem, value: any) => {
    const updatedItems = [...purchaseOrderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate line_amount and total_amount when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const item = updatedItems[index];
      const qty = parseFloat(item.quantity?.toString() || '0');
      const price = parseFloat(item.unit_price?.toString() || '0');
      item.line_amount = qty * price;
      item.total_amount = item.line_amount + parseFloat(item.tax_amount?.toString() || '0');
    }

    setPurchaseOrderItems(updatedItems);
  };

  // Oracle Fusion payload types
  interface OracleFusionPOHeader {
    POHeaderId: number;
    OrderNumber: string;
    StatusCode: string;
    Status: string;
    ProcurementBUId?: number;
    ProcurementBU?: string;
    SupplierId?: number;
    Supplier?: string;
    SupplierSiteId?: number;
    SupplierSite?: string;
    BuyerId?: number;
    Buyer?: string;
    ShipToLocationId?: number;
    ShipToLocationCode?: string;
    ShipToLocationAddress?: string;
    CurrencyCode?: string;
    Ordered?: number;
    TotalTax?: number;
    Total?: number;
    OrderDate?: string;
  }

  interface OracleFusionPOLine {
    POLineId: number;
    POHeaderId: number;
    LineNumber: number;
    LineType?: string;
    ItemId?: number;
    Item?: string;
    Description?: string;
    CategoryCode?: string;
    StatusCode?: string;
    Status?: string;
    UOMCode?: string;
    UOM?: string;
    Quantity?: number;
    Price?: number;
    BasePrice?: number;
    CurrencyCode?: string;
    Ordered?: number;
    TotalTax?: number;
    Total?: number;
  }

  const handleGeneratePO = () => {
    // Sample Oracle Fusion payload - in production, this would come from an API or user input
    const oraclePayload = {
      header: {
        POHeaderId: 300000573532816,
        OrderNumber: "60010757",
        StatusCode: "OPEN",
        Status: "Open",
        ProcurementBUId: 300000002682225,
        ProcurementBU: "ev Ltd.",
        SupplierId: 300000005154086,
        Supplier: "GALAXY TECHNOLOGY (BANGLADESH) LTD.",
        SupplierSiteId: 300000162990875,
        SupplierSite: "87833",
        BuyerId: 300000003847611,
        Buyer: "Chowdhury, Md. Rasel",
        ShipToLocationId: 300000005327246,
        ShipToLocationCode: "IPS-Sales",
        ShipToLocationAddress: "EV House Bashundhara, Baridhara, Dhaka, Dhaka, Bhatara, Khilkhet, 1229",
        CurrencyCode: "BDT",
        Ordered: 15000000.00,
        TotalTax: 0,
        Total: 15000000.00,
        OrderDate: "2026-01-19T19:13:23+00:00"
      },
      lines: [
        {
          POLineId: 300000573532818,
          POHeaderId: 300000573532816,
          LineNumber: 1,
          LineType: "Goods",
          ItemId: 100000005018711,
          Item: "3003361",
          Description: "IMSI PRE - 089 128K USIM",
          CategoryCode: "71010000-71010801",
          StatusCode: "OPEN",
          Status: "Open",
          UOMCode: "EA",
          UOM: "Each",
          Quantity: 300000,
          Price: 50,
          BasePrice: 50,
          CurrencyCode: "BDT",
          Ordered: 15000000.00,
          TotalTax: 0,
          Total: 15000000.00
        }
      ]
    } as { header: OracleFusionPOHeader; lines: OracleFusionPOLine[] };

    try {
      // Map Oracle Fusion header to our form data
      const header = oraclePayload.header;

      // Map order_status from StatusCode
      let orderStatus: 'pending' | 'partially_received' | 'full_received' = 'pending';
      if (header.StatusCode === 'CLOSED' || header.Status === 'Closed') {
        orderStatus = 'full_received';
      } else if (header.StatusCode === 'PARTIALLY_RECEIVED' || header.Status === 'Partially Received') {
        orderStatus = 'partially_received';
      }

      // Update form data - mapping Oracle Fusion fields to our database schema
      setFormData({
        po_number: header.OrderNumber || '',
        status_code: header.StatusCode || 'APPROVED',
        status_name: header.Status || '',
        order_status: orderStatus,
        procurement_bu_id: header.ProcurementBUId?.toString() || '',
        procurement_bu_name: header.ProcurementBU || '',
        supplier_id: header.SupplierId?.toString() || '',
        supplier_name: header.Supplier || '',
        supplier_site_id: header.SupplierSiteId?.toString() || '',
        supplier_site_code: header.SupplierSite || '',
        buyer_id: header.BuyerId?.toString() || '',
        buyer_name: header.Buyer || '',
        ship_to_location_id: header.ShipToLocationId?.toString() || '',
        ship_to_location_code: header.ShipToLocationCode || '',
        ship_to_address: header.ShipToLocationAddress || '',
        currency_code: header.CurrencyCode || '',
        ordered_amount: header.Ordered?.toString() || '',
        tax_amount: header.TotalTax?.toString() || '',
        total_amount: header.Total?.toString() || '',
        order_date: header.OrderDate ? new Date(header.OrderDate).toISOString().slice(0, 16) : '',
        source_system: 'oracle_fusion',
      });

      // Store Oracle Fusion POHeaderId for later use in handleCreate
      // We'll use this when creating the purchase order
      (window as any).__oracleFusionPOHeaderId = header.POHeaderId;

      // Map Oracle Fusion lines to our line items
      // Store POLineId in a way we can retrieve it later (we'll use a custom property)
      const mappedLines: IPurchaseOrderLineItem[] = oraclePayload.lines.map((line) => {
        const mappedLine: IPurchaseOrderLineItem & { _oraclePOLineId?: number } = {
          line_number: line.LineNumber,
          line_status_code: line.StatusCode || 'OPEN',
          line_status_name: line.Status || 'Open',
          line_type: line.LineType || '',
          item_id: line.ItemId || null,
          item_code: line.Item || '',
          item_description: line.Description || '',
          category_code: line.CategoryCode || '',
          uom_code: line.UOMCode || '',
          uom_name: line.UOM || '',
          quantity: line.Quantity || 0,
          unit_price: line.Price || line.BasePrice || 0,
          currency_code: line.CurrencyCode || header.CurrencyCode || '',
          line_amount: line.Ordered || 0,
          tax_amount: line.TotalTax || 0,
          total_amount: line.Total || 0,
        };
        // Store Oracle Fusion POLineId for later use
        (mappedLine as any)._oraclePOLineId = line.POLineId;
        return mappedLine;
      });

      setPurchaseOrderItems(mappedLines);

      toast({
        title: "Success",
        description: `Generated PO from Oracle Fusion: ${header.OrderNumber}`,
      });
    } catch (error: any) {
      console.error('Error generating PO:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate purchase order",
        variant: "destructive"
      });
    }
  };

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title="Create New Purchase Order"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" },
            { label: "New Purchase Order", href: "/purchase-orders/new" }
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Purchase Order Information</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGeneratePO}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate PO
                </Button>
                <Button variant="outline" onClick={() => router.push('/purchase-orders')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Purchase Orders
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="po_number">PO Number (Optional)</Label>
                    <Input
                      id="po_number"
                      value={formData.po_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                      placeholder="Leave empty to auto-generate"
                    />
                    <p className="text-sm text-gray-500 mt-1">If left empty, a PO number will be auto-generated</p>
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

              {/* Supplier & Buyer Information */}
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

              {/* Procurement BU Information */}
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

              {/* Shipping Information */}
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

              {/* Financial Information */}
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
                    <p className="text-sm text-gray-500 mt-1">Leave empty to auto-calculate from line items</p>
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
                    <p className="text-sm text-gray-500 mt-1">Leave empty to auto-calculate from line items</p>
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
                    <p className="text-sm text-gray-500 mt-1">Leave empty to auto-calculate from line items</p>
                  </div>
                </div>
              </div>

              {/* Purchase Order Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Purchase Order Lines *</Label>
                    <p className="text-sm text-gray-500 mt-1">Add items to this purchase order</p>
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
                      // Find selected item by item_code or item_id
                      const selectedItem = availableItems.find(i =>
                        i.item.toString() === item.item_code ||
                        (item.item_id && i.item === item.item_id)
                      );
                      return (
                        <Card key={index} className="border-2">
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
                              {/* Item Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`item_${index}`}>Item Code *</Label>
                                  <Select
                                    value={item.item_code || (item.item_id ? item.item_id.toString() : '')}
                                    onValueChange={(value) => {
                                      const selectedItem = availableItems.find(i => i.item.toString() === value);
                                      if (selectedItem) {
                                        // Update all fields at once to avoid state sync issues
                                        const updatedItems = [...purchaseOrderItems];
                                        updatedItems[index] = {
                                          ...updatedItems[index],
                                          item_code: selectedItem.item.toString(),
                                          item_id: selectedItem.item,
                                          item_description: selectedItem.description || '',
                                          uom_code: selectedItem.primary_uom_code || '',
                                          uom_name: selectedItem.primary_uom_name || '',
                                          category_code: selectedItem.item_class || '',
                                        };
                                        setPurchaseOrderItems(updatedItems);
                                      } else {
                                        // If item not found, just update the item_code
                                        updatePurchaseOrderItem(index, 'item_code', value);
                                      }
                                    }}
                                  >
                                    <SelectTrigger id={`item_${index}`}>
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {loadingItems ? (
                                        <SelectItem value="" disabled>Loading items...</SelectItem>
                                      ) : (
                                        availableItems.map((availableItem) => (
                                          <SelectItem key={availableItem.item} value={availableItem.item.toString()}>
                                            {availableItem.item} - {availableItem.description || 'No description'}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {selectedItem && (
                                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                                      {selectedItem.primary_uom_code && (
                                        <p>UOM: {selectedItem.primary_uom_code} {selectedItem.primary_uom_name && `(${selectedItem.primary_uom_name})`}</p>
                                      )}
                                      {selectedItem.user_item_type && (
                                        <p>Type: {selectedItem.user_item_type}</p>
                                      )}
                                    </div>
                                  )}
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

                              {/* Line Status */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`line_status_code_${index}`}>Line Status Code *</Label>
                                  <Input
                                    id={`line_status_code_${index}`}
                                    value={item.line_status_code}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'line_status_code', e.target.value)}
                                    placeholder="e.g., OPEN, CLOSED"
                                    required
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

                              {/* Quantity and UOM */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`quantity_${index}`}>Quantity *</Label>
                                  <Input
                                    id={`quantity_${index}`}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={item.quantity}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    placeholder="Enter quantity"
                                    required
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

                              {/* Pricing */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`unit_price_${index}`}>Unit Price</Label>
                                  <Input
                                    id={`unit_price_${index}`}
                                    type="number"
                                    step="0.0001"
                                    value={item.unit_price}
                                    onChange={(e) => updatePurchaseOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
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
                                    onChange={(e) => updatePurchaseOrderItem(index, 'line_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="Line amount (auto-calculated)"
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Auto-calculated: Quantity × Unit Price</p>
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
                                      const lineAmount = parseFloat(item.line_amount?.toString() || '0');
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
                                    onChange={(e) => updatePurchaseOrderItem(index, 'total_amount', parseFloat(e.target.value) || 0)}
                                    placeholder="Total amount (auto-calculated)"
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Auto-calculated: Line Amount + Tax Amount</p>
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

              {/* Summary */}
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
                          {purchaseOrderItems.reduce((sum, item) => sum + (parseFloat(item.quantity?.toString() || '0')), 0).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Line Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrderItems.reduce((sum, item) => sum + (parseFloat(item.line_amount?.toString() || '0')), 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrderItems.reduce((sum, item) => sum + (parseFloat(item.total_amount?.toString() || '0')), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => router.push('/purchase-orders')}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createLoading || purchaseOrderItems.length === 0}>
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Purchase Order'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

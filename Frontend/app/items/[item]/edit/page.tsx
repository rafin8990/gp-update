"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { itemsApi, IItem } from '@/lib/api/items';

export default function EditItemPage() {
  const params = useParams<{ item: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic
    item: '',
    description: '',
    
    // Inventory
    inventory_organization: '',
    primary_uom_name: '',
    primary_uom_code: '',
    item_status: '',
    user_item_type: '',
    item_class: '',
    inventory_item: false,
    stockable: false,
    serial_generation: '',
    lot_control: '',
    
    // Costing
    costing_enabled: false,
    inventory_asset_value: false,
    including_in_rollup: false,
    cost_of_goods_sold_account: '',
    
    // Purchasing
    purchased: false,
    purchasable: false,
    match_approval_level: '',
    invoice_match_option: '',
    receipt_required: false,
    inspection_required: false,
    input_tax_classification_code: '',
    expense_account: '',
    receipt_routing: '',
    
    // Receiving / Order Management
    customer_ordered: false,
    shippable_item: false,
    transfer_orders_enabled: false,
    order_management_transactable: false,
    returnable: false,
    
    // Invoicing
    invoiceable_item: false,
    invoice_enabled: false,
    sales_account: '',
    output_tax_classification_code: '',
    
    // Item Categories - Inventory Catalog
    inventory_catalog: '',
    inventory_catalog_name: '',
    inventory_catalog_code: '',
    inventory_catalog_description: '',
    
    // Item Categories - Tax Catalog
    tax_catalog: '',
    tax_catalog_name: '',
    tax_catalog_code: '',
    tax_catalog_description: '',
    
    // Item Categories - Purchasing Catalog
    purchasing_catalog: '',
    purchasing_catalog_name: '',
    purchasing_catalog_code: '',
    purchasing_catalog_description: '',
    
    // Purchasing Category Hierarchy
    l1_description: '',
    l2_description: '',
    l3_description: '',
    l4_description: '',
    l5_description: '',
    
    // Audit
    created_by: '',
    last_update_by: '',
    
    // Agreement
    bpa_cpa_item: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params?.item) {
      fetchItem();
    }
  }, [params?.item]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const item = await itemsApi.getById(Number(params.item));
      setFormData({
        item: item.item.toString(),
        description: item.description || '',
        inventory_organization: item.inventory_organization || '',
        primary_uom_name: item.primary_uom_name || '',
        primary_uom_code: item.primary_uom_code || '',
        item_status: item.item_status || '',
        user_item_type: item.user_item_type || '',
        item_class: item.item_class || '',
        inventory_item: item.inventory_item || false,
        stockable: item.stockable || false,
        serial_generation: item.serial_generation || '',
        lot_control: item.lot_control || '',
        costing_enabled: item.costing_enabled || false,
        inventory_asset_value: item.inventory_asset_value || false,
        including_in_rollup: item.including_in_rollup || false,
        cost_of_goods_sold_account: item.cost_of_goods_sold_account || '',
        purchased: item.purchased || false,
        purchasable: item.purchasable || false,
        match_approval_level: item.match_approval_level || '',
        invoice_match_option: item.invoice_match_option || '',
        receipt_required: item.receipt_required || false,
        inspection_required: item.inspection_required || false,
        input_tax_classification_code: item.input_tax_classification_code || '',
        expense_account: item.expense_account || '',
        receipt_routing: item.receipt_routing || '',
        customer_ordered: item.customer_ordered || false,
        shippable_item: item.shippable_item || false,
        transfer_orders_enabled: item.transfer_orders_enabled || false,
        order_management_transactable: item.order_management_transactable || false,
        returnable: item.returnable || false,
        invoiceable_item: item.invoiceable_item || false,
        invoice_enabled: item.invoice_enabled || false,
        sales_account: item.sales_account || '',
        output_tax_classification_code: item.output_tax_classification_code || '',
        inventory_catalog: item.inventory_catalog || '',
        inventory_catalog_name: item.inventory_catalog_name || '',
        inventory_catalog_code: item.inventory_catalog_code || '',
        inventory_catalog_description: item.inventory_catalog_description || '',
        tax_catalog: item.tax_catalog || '',
        tax_catalog_name: item.tax_catalog_name || '',
        tax_catalog_code: item.tax_catalog_code || '',
        tax_catalog_description: item.tax_catalog_description || '',
        purchasing_catalog: item.purchasing_catalog || '',
        purchasing_catalog_name: item.purchasing_catalog_name || '',
        purchasing_catalog_code: item.purchasing_catalog_code || '',
        purchasing_catalog_description: item.purchasing_catalog_description || '',
        l1_description: item.l1_description || '',
        l2_description: item.l2_description || '',
        l3_description: item.l3_description || '',
        l4_description: item.l4_description || '',
        l5_description: item.l5_description || '',
        created_by: item.created_by || '',
        last_update_by: item.last_update_by || '',
        bpa_cpa_item: item.bpa_cpa_item || false,
      });
    } catch (error: any) {
      console.error('Error fetching item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch item",
        variant: "destructive"
      });
      router.push('/items');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!params?.item) return;

    try {
      setUpdateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.primary_uom_code.trim()) {
        setFormErrors(prev => ({ ...prev, primary_uom_code: 'UOM code is required' }));
        return;
      }

      const updatePayload = {
        description: formData.description || null,
        inventory_organization: formData.inventory_organization || null,
        primary_uom_name: formData.primary_uom_name || null,
        primary_uom_code: formData.primary_uom_code || null,
        item_status: formData.item_status || null,
        user_item_type: formData.user_item_type || null,
        item_class: formData.item_class || null,
        inventory_item: formData.inventory_item || null,
        stockable: formData.stockable || null,
        serial_generation: formData.serial_generation || null,
        lot_control: formData.lot_control || null,
        costing_enabled: formData.costing_enabled || null,
        inventory_asset_value: formData.inventory_asset_value || null,
        including_in_rollup: formData.including_in_rollup || null,
        cost_of_goods_sold_account: formData.cost_of_goods_sold_account || null,
        purchased: formData.purchased || null,
        purchasable: formData.purchasable || null,
        match_approval_level: formData.match_approval_level || null,
        invoice_match_option: formData.invoice_match_option || null,
        receipt_required: formData.receipt_required || null,
        inspection_required: formData.inspection_required || null,
        input_tax_classification_code: formData.input_tax_classification_code || null,
        expense_account: formData.expense_account || null,
        receipt_routing: formData.receipt_routing || null,
        customer_ordered: formData.customer_ordered || null,
        shippable_item: formData.shippable_item || null,
        transfer_orders_enabled: formData.transfer_orders_enabled || null,
        order_management_transactable: formData.order_management_transactable || null,
        returnable: formData.returnable || null,
        invoiceable_item: formData.invoiceable_item || null,
        invoice_enabled: formData.invoice_enabled || null,
        sales_account: formData.sales_account || null,
        output_tax_classification_code: formData.output_tax_classification_code || null,
        inventory_catalog: formData.inventory_catalog || null,
        inventory_catalog_name: formData.inventory_catalog_name || null,
        inventory_catalog_code: formData.inventory_catalog_code || null,
        inventory_catalog_description: formData.inventory_catalog_description || null,
        tax_catalog: formData.tax_catalog || null,
        tax_catalog_name: formData.tax_catalog_name || null,
        tax_catalog_code: formData.tax_catalog_code || null,
        tax_catalog_description: formData.tax_catalog_description || null,
        purchasing_catalog: formData.purchasing_catalog || null,
        purchasing_catalog_name: formData.purchasing_catalog_name || null,
        purchasing_catalog_code: formData.purchasing_catalog_code || null,
        purchasing_catalog_description: formData.purchasing_catalog_description || null,
        l1_description: formData.l1_description || null,
        l2_description: formData.l2_description || null,
        l3_description: formData.l3_description || null,
        l4_description: formData.l4_description || null,
        l5_description: formData.l5_description || null,
        last_update_by: formData.last_update_by || null,
        bpa_cpa_item: formData.bpa_cpa_item || null,
      };

      await itemsApi.update(Number(params.item), updatePayload);
      toast({
        title: "Success",
        description: "Item updated successfully"
      });
      router.push('/items');
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout activePage="items">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Edit Item"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" },
            { label: `Edit Item ${params.item}`, href: `/items/${params.item}/edit` }
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Item Information</CardTitle>
              <Button variant="outline" onClick={() => router.push('/items')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="costing">Costing</TabsTrigger>
                <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
                <TabsTrigger value="order">Order Mgmt</TabsTrigger>
                <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
                <TabsTrigger value="catalogs">Catalogs</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-item">Item Number</Label>
                    <Input
                      id="edit-item"
                      value={formData.item}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-primary-uom-code">UOM Code *</Label>
                    <Input
                      id="edit-primary-uom-code"
                      value={formData.primary_uom_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_uom_code: e.target.value }))}
                      placeholder="Enter UOM code"
                      className={formErrors.primary_uom_code ? "border-red-500" : ""}
                    />
                    {formErrors.primary_uom_code && <p className="text-sm text-red-500 mt-1">{formErrors.primary_uom_code}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter item description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-item-status">Status</Label>
                    <Select value={formData.item_status} onValueChange={(value) => setFormData(prev => ({ ...prev, item_status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-user-item-type">Item Type</Label>
                    <Input
                      id="edit-user-item-type"
                      value={formData.user_item_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_item_type: e.target.value }))}
                      placeholder="Enter item type"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-item-class">Item Class</Label>
                    <Input
                      id="edit-item-class"
                      value={formData.item_class}
                      onChange={(e) => setFormData(prev => ({ ...prev, item_class: e.target.value }))}
                      placeholder="Enter item class"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-bpa_cpa_item"
                      checked={formData.bpa_cpa_item}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bpa_cpa_item: checked as boolean }))}
                    />
                    <Label htmlFor="edit-bpa_cpa_item" className="cursor-pointer">BPA/CPA Item</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Rest of the tabs are the same as in new/page.tsx - I'll include them all */}
              <TabsContent value="inventory" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-inventory_organization">Inventory Organization</Label>
                    <Input
                      id="edit-inventory_organization"
                      value={formData.inventory_organization}
                      onChange={(e) => setFormData(prev => ({ ...prev, inventory_organization: e.target.value }))}
                      placeholder="Enter organization"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-primary_uom_name">Primary UOM Name</Label>
                    <Input
                      id="edit-primary_uom_name"
                      value={formData.primary_uom_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_uom_name: e.target.value }))}
                      placeholder="Enter primary UOM name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-serial_generation">Serial Generation</Label>
                    <Input
                      id="edit-serial_generation"
                      value={formData.serial_generation}
                      onChange={(e) => setFormData(prev => ({ ...prev, serial_generation: e.target.value }))}
                      placeholder="Enter serial generation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lot_control">Lot Control</Label>
                    <Input
                      id="edit-lot_control"
                      value={formData.lot_control}
                      onChange={(e) => setFormData(prev => ({ ...prev, lot_control: e.target.value }))}
                      placeholder="Enter lot control"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-inventory_item"
                      checked={formData.inventory_item}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inventory_item: checked as boolean }))}
                    />
                    <Label htmlFor="edit-inventory_item" className="cursor-pointer">Inventory Item</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-stockable"
                      checked={formData.stockable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, stockable: checked as boolean }))}
                    />
                    <Label htmlFor="edit-stockable" className="cursor-pointer">Stockable</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="costing" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-cost_of_goods_sold_account">Cost of Goods Sold Account</Label>
                    <Input
                      id="edit-cost_of_goods_sold_account"
                      value={formData.cost_of_goods_sold_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_of_goods_sold_account: e.target.value }))}
                      placeholder="Enter account"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-costing_enabled"
                      checked={formData.costing_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, costing_enabled: checked as boolean }))}
                    />
                    <Label htmlFor="edit-costing_enabled" className="cursor-pointer">Costing Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-inventory_asset_value"
                      checked={formData.inventory_asset_value}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inventory_asset_value: checked as boolean }))}
                    />
                    <Label htmlFor="edit-inventory_asset_value" className="cursor-pointer">Inventory Asset Value</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-including_in_rollup"
                      checked={formData.including_in_rollup}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, including_in_rollup: checked as boolean }))}
                    />
                    <Label htmlFor="edit-including_in_rollup" className="cursor-pointer">Including in Rollup</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="purchasing" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-match_approval_level">Match Approval Level</Label>
                    <Input
                      id="edit-match_approval_level"
                      value={formData.match_approval_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, match_approval_level: e.target.value }))}
                      placeholder="Enter match approval level"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-invoice_match_option">Invoice Match Option</Label>
                    <Input
                      id="edit-invoice_match_option"
                      value={formData.invoice_match_option}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_match_option: e.target.value }))}
                      placeholder="Enter invoice match option"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-input_tax_classification_code">Input Tax Classification Code</Label>
                    <Input
                      id="edit-input_tax_classification_code"
                      value={formData.input_tax_classification_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, input_tax_classification_code: e.target.value }))}
                      placeholder="Enter tax classification code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-expense_account">Expense Account</Label>
                    <Input
                      id="edit-expense_account"
                      value={formData.expense_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, expense_account: e.target.value }))}
                      placeholder="Enter expense account"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-receipt_routing">Receipt Routing</Label>
                    <Input
                      id="edit-receipt_routing"
                      value={formData.receipt_routing}
                      onChange={(e) => setFormData(prev => ({ ...prev, receipt_routing: e.target.value }))}
                      placeholder="Enter receipt routing"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-purchased"
                      checked={formData.purchased}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, purchased: checked as boolean }))}
                    />
                    <Label htmlFor="edit-purchased" className="cursor-pointer">Purchased</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-purchasable"
                      checked={formData.purchasable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, purchasable: checked as boolean }))}
                    />
                    <Label htmlFor="edit-purchasable" className="cursor-pointer">Purchasable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-receipt_required"
                      checked={formData.receipt_required}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, receipt_required: checked as boolean }))}
                    />
                    <Label htmlFor="edit-receipt_required" className="cursor-pointer">Receipt Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-inspection_required"
                      checked={formData.inspection_required}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inspection_required: checked as boolean }))}
                    />
                    <Label htmlFor="edit-inspection_required" className="cursor-pointer">Inspection Required</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="order" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-customer_ordered"
                      checked={formData.customer_ordered}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, customer_ordered: checked as boolean }))}
                    />
                    <Label htmlFor="edit-customer_ordered" className="cursor-pointer">Customer Ordered</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-shippable_item"
                      checked={formData.shippable_item}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, shippable_item: checked as boolean }))}
                    />
                    <Label htmlFor="edit-shippable_item" className="cursor-pointer">Shippable Item</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-transfer_orders_enabled"
                      checked={formData.transfer_orders_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, transfer_orders_enabled: checked as boolean }))}
                    />
                    <Label htmlFor="edit-transfer_orders_enabled" className="cursor-pointer">Transfer Orders Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-order_management_transactable"
                      checked={formData.order_management_transactable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, order_management_transactable: checked as boolean }))}
                    />
                    <Label htmlFor="edit-order_management_transactable" className="cursor-pointer">Order Management Transactable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-returnable"
                      checked={formData.returnable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, returnable: checked as boolean }))}
                    />
                    <Label htmlFor="edit-returnable" className="cursor-pointer">Returnable</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="invoicing" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-sales_account">Sales Account</Label>
                    <Input
                      id="edit-sales_account"
                      value={formData.sales_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, sales_account: e.target.value }))}
                      placeholder="Enter sales account"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-output_tax_classification_code">Output Tax Classification Code</Label>
                    <Input
                      id="edit-output_tax_classification_code"
                      value={formData.output_tax_classification_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, output_tax_classification_code: e.target.value }))}
                      placeholder="Enter tax classification code"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-invoiceable_item"
                      checked={formData.invoiceable_item}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, invoiceable_item: checked as boolean }))}
                    />
                    <Label htmlFor="edit-invoiceable_item" className="cursor-pointer">Invoiceable Item</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-invoice_enabled"
                      checked={formData.invoice_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, invoice_enabled: checked as boolean }))}
                    />
                    <Label htmlFor="edit-invoice_enabled" className="cursor-pointer">Invoice Enabled</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="catalogs" className="space-y-4 mt-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Inventory Catalog</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-inventory_catalog">Catalog</Label>
                        <Input
                          id="edit-inventory_catalog"
                          value={formData.inventory_catalog}
                          onChange={(e) => setFormData(prev => ({ ...prev, inventory_catalog: e.target.value }))}
                          placeholder="Enter catalog"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-inventory_catalog_name">Catalog Name</Label>
                        <Input
                          id="edit-inventory_catalog_name"
                          value={formData.inventory_catalog_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, inventory_catalog_name: e.target.value }))}
                          placeholder="Enter catalog name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-inventory_catalog_code">Catalog Code</Label>
                        <Input
                          id="edit-inventory_catalog_code"
                          value={formData.inventory_catalog_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, inventory_catalog_code: e.target.value }))}
                          placeholder="Enter catalog code"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="edit-inventory_catalog_description">Catalog Description</Label>
                        <Textarea
                          id="edit-inventory_catalog_description"
                          value={formData.inventory_catalog_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, inventory_catalog_description: e.target.value }))}
                          placeholder="Enter catalog description"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Tax Catalog</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-tax_catalog">Catalog</Label>
                        <Input
                          id="edit-tax_catalog"
                          value={formData.tax_catalog}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_catalog: e.target.value }))}
                          placeholder="Enter catalog"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-tax_catalog_name">Catalog Name</Label>
                        <Input
                          id="edit-tax_catalog_name"
                          value={formData.tax_catalog_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_catalog_name: e.target.value }))}
                          placeholder="Enter catalog name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-tax_catalog_code">Catalog Code</Label>
                        <Input
                          id="edit-tax_catalog_code"
                          value={formData.tax_catalog_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_catalog_code: e.target.value }))}
                          placeholder="Enter catalog code"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="edit-tax_catalog_description">Catalog Description</Label>
                        <Textarea
                          id="edit-tax_catalog_description"
                          value={formData.tax_catalog_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_catalog_description: e.target.value }))}
                          placeholder="Enter catalog description"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Purchasing Catalog</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-purchasing_catalog">Catalog</Label>
                        <Input
                          id="edit-purchasing_catalog"
                          value={formData.purchasing_catalog}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasing_catalog: e.target.value }))}
                          placeholder="Enter catalog"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-purchasing_catalog_name">Catalog Name</Label>
                        <Input
                          id="edit-purchasing_catalog_name"
                          value={formData.purchasing_catalog_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasing_catalog_name: e.target.value }))}
                          placeholder="Enter catalog name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-purchasing_catalog_code">Catalog Code</Label>
                        <Input
                          id="edit-purchasing_catalog_code"
                          value={formData.purchasing_catalog_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasing_catalog_code: e.target.value }))}
                          placeholder="Enter catalog code"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="edit-purchasing_catalog_description">Catalog Description</Label>
                        <Textarea
                          id="edit-purchasing_catalog_description"
                          value={formData.purchasing_catalog_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasing_catalog_description: e.target.value }))}
                          placeholder="Enter catalog description"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-l1_description">L1 Description</Label>
                    <Textarea
                      id="edit-l1_description"
                      value={formData.l1_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, l1_description: e.target.value }))}
                      placeholder="Enter L1 description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-l2_description">L2 Description</Label>
                    <Textarea
                      id="edit-l2_description"
                      value={formData.l2_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, l2_description: e.target.value }))}
                      placeholder="Enter L2 description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-l3_description">L3 Description</Label>
                    <Textarea
                      id="edit-l3_description"
                      value={formData.l3_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, l3_description: e.target.value }))}
                      placeholder="Enter L3 description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-l4_description">L4 Description</Label>
                    <Textarea
                      id="edit-l4_description"
                      value={formData.l4_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, l4_description: e.target.value }))}
                      placeholder="Enter L4 description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-l5_description">L5 Description</Label>
                    <Textarea
                      id="edit-l5_description"
                      value={formData.l5_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, l5_description: e.target.value }))}
                      placeholder="Enter L5 description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-last_update_by">Last Update By</Label>
                    <Input
                      id="edit-last_update_by"
                      value={formData.last_update_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_update_by: e.target.value }))}
                      placeholder="Enter updater name"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={() => router.push('/items')}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Item'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

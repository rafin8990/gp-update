"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  FileText, 
  Tag,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  Boxes,
  Scale,
  Layers,
  Receipt,
  CreditCard,
  Archive,
  Info,
  Hash
} from 'lucide-react';
import { itemsApi, IItem } from '@/lib/api/items';
import { useToast } from '@/hooks/use-toast';

export default function ItemViewPage() {
  const params = useParams<{ item: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<IItem | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const itemNumber = Number(params.item);
        if (isNaN(itemNumber)) {
          toast({
            title: "Error",
            description: "Invalid item number",
            variant: "destructive"
          });
          router.push('/items');
          return;
        }

        const itemData = await itemsApi.getById(itemNumber);
        setItem(itemData);
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

    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.item]);

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const InfoField = ({ label, value, icon: Icon }: { label: string; value: string | number | boolean | null | undefined; icon?: any }) => {
    if (value === null || value === undefined || value === '') return null;
    
    const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
    
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
        {Icon && <Icon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
          <div className="text-sm font-medium text-gray-900 break-words">{displayValue}</div>
        </div>
      </div>
    );
  };

  const BooleanField = ({ label, value, icon: Icon }: { label: string; value: boolean | null | undefined; icon?: any }) => {
    if (value === null || value === undefined) return null;
    
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
        {Icon && <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />}
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
          <div className="flex items-center gap-2">
            {value ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-900">{value ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageLayout activePage="items">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading item details...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!item) {
    return (
      <PageLayout activePage="items">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Item not found</p>
            <Button onClick={() => router.push('/items')} className="mt-4">
              Back to Items
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title={`Item #${item.item}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" },
            { label: `Item ${item.item}`, href: `/items/${item.item}` }
          ]}
        />

        {/* Header Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Item #{item.item}</CardTitle>
                    <CardDescription className="mt-1">
                      {item.description || 'No description available'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {item.item_status && (
                    <Badge className={`${getStatusColor(item.item_status)} border`}>
                      {item.item_status}
                    </Badge>
                  )}
                  {item.user_item_type && (
                    <Badge variant="outline" className="border-gray-300">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.user_item_type}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/items')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => router.push(`/items/${item.item}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">
              <Info className="h-4 w-4 mr-2" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Boxes className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="costing">
              <DollarSign className="h-4 w-4 mr-2" />
              Costing
            </TabsTrigger>
            <TabsTrigger value="purchasing">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchasing
            </TabsTrigger>
            <TabsTrigger value="order">
              <Truck className="h-4 w-4 mr-2" />
              Order Mgmt
            </TabsTrigger>
            <TabsTrigger value="other">
              <FileText className="h-4 w-4 mr-2" />
              Other
            </TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Item Number" value={item.item} icon={Hash} />
                  <InfoField label="UOM Code" value={item.primary_uom_code} icon={Scale} />
                  <div className="md:col-span-2">
                    <InfoField label="Description" value={item.description} icon={FileText} />
                  </div>
                  <InfoField label="Item Type" value={item.user_item_type} icon={Tag} />
                  <InfoField label="Item Class" value={item.item_class} icon={Layers} />
                  <InfoField label="Primary UOM Name" value={item.primary_uom_name} icon={Scale} />
                  <InfoField label="Status" value={item.item_status} icon={CheckCircle2} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Audit Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Created At" value={formatDate(item.creation_date)} icon={Calendar} />
                  <InfoField label="Last Updated" value={formatDate(item.last_update_date)} icon={Calendar} />
                  <InfoField label="Created By" value={item.created_by} icon={User} />
                  <InfoField label="Last Updated By" value={item.last_update_by} icon={User} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Information */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Inventory Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Inventory Organization" value={item.inventory_organization} icon={Building2} />
                  <InfoField label="Primary UOM Name" value={item.primary_uom_name} icon={Scale} />
                  <InfoField label="Primary UOM Code" value={item.primary_uom_code} icon={Scale} />
                  <InfoField label="Serial Generation" value={item.serial_generation} icon={Tag} />
                  <InfoField label="Lot Control" value={item.lot_control} icon={Archive} />
                  <BooleanField label="Inventory Item" value={item.inventory_item} icon={Boxes} />
                  <BooleanField label="Stockable" value={item.stockable} icon={Package} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Catalog Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Inventory Catalog</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField label="Catalog" value={item.inventory_catalog} />
                      <InfoField label="Catalog Name" value={item.inventory_catalog_name} />
                      <InfoField label="Catalog Code" value={item.inventory_catalog_code} />
                      <div className="md:col-span-2">
                        <InfoField label="Catalog Description" value={item.inventory_catalog_description} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costing Information */}
          <TabsContent value="costing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Costing Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Cost of Goods Sold Account" value={item.cost_of_goods_sold_account} icon={CreditCard} />
                  <BooleanField label="Costing Enabled" value={item.costing_enabled} icon={DollarSign} />
                  <BooleanField label="Inventory Asset Value" value={item.inventory_asset_value} icon={DollarSign} />
                  <BooleanField label="Including in Rollup" value={item.including_in_rollup} icon={Layers} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchasing Information */}
          <TabsContent value="purchasing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchasing Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Match Approval Level" value={item.match_approval_level} icon={CheckCircle2} />
                  <InfoField label="Invoice Match Option" value={item.invoice_match_option} icon={Receipt} />
                  <InfoField label="Input Tax Classification Code" value={item.input_tax_classification_code} icon={Tag} />
                  <InfoField label="Expense Account" value={item.expense_account} icon={CreditCard} />
                  <InfoField label="Receipt Routing" value={item.receipt_routing} icon={Truck} />
                  <BooleanField label="Purchased" value={item.purchased} icon={ShoppingCart} />
                  <BooleanField label="Purchasable" value={item.purchasable} icon={ShoppingCart} />
                  <BooleanField label="Receipt Required" value={item.receipt_required} icon={Receipt} />
                  <BooleanField label="Inspection Required" value={item.inspection_required} icon={CheckCircle2} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Purchasing Catalog
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Catalog" value={item.purchasing_catalog} />
                  <InfoField label="Catalog Name" value={item.purchasing_catalog_name} />
                  <InfoField label="Catalog Code" value={item.purchasing_catalog_code} />
                  <div className="md:col-span-2">
                    <InfoField label="Catalog Description" value={item.purchasing_catalog_description} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Management Information */}
          <TabsContent value="order" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Order Management Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BooleanField label="Customer Ordered" value={item.customer_ordered} icon={ShoppingCart} />
                  <BooleanField label="Shippable Item" value={item.shippable_item} icon={Truck} />
                  <BooleanField label="Transfer Orders Enabled" value={item.transfer_orders_enabled} icon={Truck} />
                  <BooleanField label="Order Management Transactable" value={item.order_management_transactable} icon={CheckCircle2} />
                  <BooleanField label="Returnable" value={item.returnable} icon={Truck} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Information */}
          <TabsContent value="other" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoicing Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Sales Account" value={item.sales_account} icon={CreditCard} />
                  <InfoField label="Output Tax Classification Code" value={item.output_tax_classification_code} icon={Tag} />
                  <BooleanField label="Invoiceable Item" value={item.invoiceable_item} icon={Receipt} />
                  <BooleanField label="Invoice Enabled" value={item.invoice_enabled} icon={Receipt} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tax Catalog
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Catalog" value={item.tax_catalog} />
                  <InfoField label="Catalog Name" value={item.tax_catalog_name} />
                  <InfoField label="Catalog Code" value={item.tax_catalog_code} />
                  <div className="md:col-span-2">
                    <InfoField label="Catalog Description" value={item.tax_catalog_description} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Category Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="L1 Description" value={item.l1_description} />
                  <InfoField label="L2 Description" value={item.l2_description} />
                  <InfoField label="L3 Description" value={item.l3_description} />
                  <InfoField label="L4 Description" value={item.l4_description} />
                  <InfoField label="L5 Description" value={item.l5_description} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BooleanField label="BPA/CPA Item" value={item.bpa_cpa_item} icon={Tag} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

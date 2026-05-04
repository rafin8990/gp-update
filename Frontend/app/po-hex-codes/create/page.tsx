"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { poCodesApi } from '@/lib/api/po-codes';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';
import { IPurchaseOrder, IPurchaseOrderLine } from '@/lib/api/purchase-orders.types';

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

export default function CreatePoCodePage() {
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    po_header_id: '',
    item_id: '',
    serial_start: '',
    serial_end: '',
    quantity: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [availablePOs, setAvailablePOs] = useState<IPurchaseOrder[]>([]);
  const [selectedPOLines, setSelectedPOLines] = useState<IPurchaseOrderLine[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoadingDropdowns(true);
        const response = await purchaseOrdersApi.getAll({ limit: 1000 });
        setAvailablePOs(response.data || []);
      } catch (error: any) {
        console.error('Error fetching purchase orders:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch purchase orders',
          variant: 'destructive',
        });
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchPurchaseOrders();
  }, [toast]);

  useEffect(() => {
    const fetchPOLines = async (poHeaderId: number) => {
      try {
        const poData = await purchaseOrdersApi.getById(poHeaderId);
        setSelectedPOLines(poData.lines || []);
      } catch (error: any) {
        console.error('Error fetching PO lines:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch purchase order lines',
          variant: 'destructive',
        });
        setSelectedPOLines([]);
      }
    };

    if (formData.po_header_id) {
      fetchPOLines(Number(formData.po_header_id));
    } else {
      setSelectedPOLines([]);
    }
  }, [formData.po_header_id, toast]);

  // Auto-calculate quantity from serial range
  useEffect(() => {
    const hasSerialStart = !!formData.serial_start?.trim();
    const hasSerialEnd = !!formData.serial_end?.trim();

    if (hasSerialStart && hasSerialEnd) {
      try {
        const start = BigInt(formData.serial_start.trim());
        const end = BigInt(formData.serial_end.trim());

        if (start <= end) {
          const calculatedQuantity = end - start + BigInt(1);
          setFormData(prev => ({
            ...prev,
            quantity: calculatedQuantity.toString(),
          }));
        }
      } catch (error) {
        console.error('Error calculating quantity from serial range:', error);
      }
    }
  }, [formData.serial_start, formData.serial_end]);

  const handlePOChange = (poHeaderId: string) => {
    setFormData(prev => ({
      ...prev,
      po_header_id: poHeaderId,
      item_id: '',
      quantity: '',
    }));
  };

  const handleItemChange = (itemId: string) => {
    const selectedLine = selectedPOLines.find(line => line.item_id?.toString() === itemId);
    const hasSerialStart = !!formData.serial_start?.trim();
    const hasSerialEnd = !!formData.serial_end?.trim();

    setFormData(prev => ({
      ...prev,
      item_id: itemId,
      quantity:
        hasSerialStart && hasSerialEnd
          ? prev.quantity
          : selectedLine?.quantity?.toString() || prev.quantity,
    }));
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});

      if (!formData.po_header_id) {
        setFormErrors(prev => ({ ...prev, po_header_id: 'Purchase order is required' }));
        return;
      }
      if (!formData.item_id) {
        setFormErrors(prev => ({ ...prev, item_id: 'Item is required' }));
        return;
      }

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
            serial_start: 'Serial start must be less than or equal to serial end',
          }));
          return;
        }

        serialStartStr = formData.serial_start;
        serialEndStr = formData.serial_end;
      }

      let quantityNum: number | null = null;
      if (hasSerialStart && hasSerialEnd) {
        const start = BigInt(formData.serial_start.trim());
        const end = BigInt(formData.serial_end.trim());
        const calculatedQuantity = end - start + BigInt(1);

        if (calculatedQuantity > BigInt(Number.MAX_SAFE_INTEGER)) {
          console.warn('Quantity exceeds safe integer range, may lose precision');
        }
        quantityNum = Number(calculatedQuantity);
      } else if (formData.quantity?.trim()) {
        const quantity = BigInt(formData.quantity.trim());
        if (quantity < BigInt(0)) {
          setFormErrors(prev => ({
            ...prev,
            quantity: 'Quantity must be a positive number',
          }));
          return;
        }
        quantityNum = Number(quantity);
      }

      const payload = {
        po_header_id: Number(formData.po_header_id),
        item_id: Number(formData.item_id),
        serial_start: serialStartStr,
        serial_end: serialEndStr,
        quantity: quantityNum,
      };

      await poCodesApi.create(payload);

      toast({
        title: 'Success',
        description: 'PO code created successfully with auto-generated 16-digit hex RFID code',
      });

      router.push('/po-hex-codes');
    } catch (error: any) {
      console.error('Error creating PO code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create PO code',
        variant: 'destructive',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const selectedPO = availablePOs.find(po => po.po_header_id.toString() === formData.po_header_id);
  const selectedLine = selectedPOLines.find(line => line.item_id?.toString() === formData.item_id);

  return (
    <PageLayout activePage="po-hex-codes">
      <div className="space-y-4">
        <PageHeader
          title="Create PO Code (RFID)"
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'PO Codes', href: '/po-hex-codes' },
            { label: 'Create', href: '/po-hex-codes/create' },
          ]}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create New PO Code</CardTitle>
            <CardDescription className="text-xs">
              Select a purchase order and item to generate a unique 16-digit hex RFID code.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              <FormSection
                title="Purchase Order Selection"
                description="Select a purchase order to view its line items."
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label htmlFor="po_header_id" className="text-[11px] mb-1">
                      Purchase Order *
                    </Label>
                    <Select value={formData.po_header_id} onValueChange={handlePOChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue
                          placeholder={loadingDropdowns ? 'Loading...' : 'Select purchase order'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingDropdowns ? (
                          <SelectItem value="loading" disabled>
                            Loading purchase orders...
                          </SelectItem>
                        ) : availablePOs.length > 0 ? (
                          availablePOs.map(po => (
                            <SelectItem key={po.po_header_id} value={po.po_header_id.toString()}>
                              {po.po_number} - {po.supplier_name || 'No supplier'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>
                            No purchase orders available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedPO && (
                      <div className="mt-1.5 rounded-md bg-blue-50 p-1.5 text-[10px] text-blue-700">
                        <p>
                          <strong>PO:</strong> {selectedPO.po_number}
                        </p>
                        <p>
                          <strong>Supplier:</strong> {selectedPO.supplier_name || 'N/A'}
                        </p>
                        <p>
                          <strong>Status:</strong> {selectedPO.order_status || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Item Selection"
                description="Select an item from the purchase order lines."
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label htmlFor="item_id" className="text-[11px] mb-1">
                      Item *
                    </Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={handleItemChange}
                      disabled={!formData.po_header_id || selectedPOLines.length === 0}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue
                          placeholder={
                            !formData.po_header_id
                              ? 'Select purchase order first'
                              : selectedPOLines.length === 0
                              ? 'Loading items...'
                              : 'Select item'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPOLines.length > 0 ? (
                          selectedPOLines.map(line => (
                            <SelectItem
                              key={line.po_line_id}
                              value={line.item_id?.toString() || ''}
                              disabled={!line.item_id}
                            >
                              {line.item_code || line.item_id} -{' '}
                              {line.item_description || 'No description'}
                              {line.quantity && ` (Qty: ${line.quantity})`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-items" disabled>
                            {formData.po_header_id ? 'No items found in this PO' : 'Select PO first'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedLine && (
                      <div className="mt-1.5 rounded-md bg-green-50 p-1.5 text-[10px] text-green-700">
                        <p>
                          <strong>Item Code:</strong>{' '}
                          {selectedLine.item_code || selectedLine.item_id}
                        </p>
                        <p>
                          <strong>Description:</strong>{' '}
                          {selectedLine.item_description || 'N/A'}
                        </p>
                        <p>
                          <strong>Quantity:</strong> {selectedLine.quantity || 'N/A'}
                        </p>
                        <p>
                          <strong>UOM:</strong> {selectedLine.uom_code || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Serial Range (Optional)"
                description="Optionally set the serial number range for tracking. If both are provided, quantity will be automatically calculated."
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label htmlFor="serial_start" className="text-[11px] mb-1">
                      Serial Start (Optional)
                    </Label>
                    <Input
                      id="serial_start"
                      type="text"
                      value={formData.serial_start}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          serial_start: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Enter serial start number"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="serial_end" className="text-[11px] mb-1">
                      Serial End (Optional)
                    </Label>
                    <Input
                      id="serial_end"
                      type="text"
                      value={formData.serial_end}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          serial_end: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Enter serial end number"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Quantity (Optional)"
                description="Optionally set quantity. Quantity is auto-calculated when serial range is provided."
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label htmlFor="quantity" className="text-[11px] mb-1">
                      Quantity (Optional)
                    </Label>
                    <Input
                      id="quantity"
                      type="text"
                      value={formData.quantity}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          quantity: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Enter quantity"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </FormSection>

              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between pt-1.5">
                <Button
                  variant="outline"
                  className="w-full md:w-auto h-8 text-sm"
                  size="sm"
                  onClick={() => router.push('/po-hex-codes')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createLoading || !formData.po_header_id || !formData.item_id}
                  className="w-full md:w-auto h-8 text-sm"
                  size="sm"
                >
                  {createLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create PO Code
                    </>
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


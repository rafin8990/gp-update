"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { IPoLotDetail, poTransactionReceiptsApi } from '@/lib/api/po-transaction-receipts';
import { itemsApi } from '@/lib/api/items';
import { purchaseOrdersApi } from '@/lib/api/purchase-orders';

interface ILotForm extends Partial<IPoLotDetail> {
  _deleted?: boolean;
}

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export default function EditPoTransactionReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<{ po_header_id: number; po_number: string }[]>([]);
  const [itemOptions, setItemOptions] = useState<{ item: number; description?: string | null }[]>([]);
  const [form, setForm] = useState({
    po_header_id: '',
    interface_line_number: '',
    transaction_type: 'deliver',
    transaction_date: '',
    source_document_code: 'PO',
    receipt_source_code: 'Vendor',
    parent_transaction_id: '',
    organization_code: '',
    document_number: '',
    document_line_number: '1',
    document_schedule_number: '1',
    business_unit: 'ev Ltd.',
    sub_inventory: 'prod',
    uom: '',
  });
  const [lots, setLots] = useState<ILotForm[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [poResponse, itemsResponse] = await Promise.all([
          purchaseOrdersApi.getAll({ limit: 500 }),
          itemsApi.getAll({ limit: 1000 }),
        ]);
        setPurchaseOrders((poResponse.data || []).map(po => ({ po_header_id: po.po_header_id, po_number: po.po_number })));
        setItemOptions((itemsResponse.data || []).map(item => ({ item: item.item, description: item.description })));
      } catch {
        // ignore load failure; existing value still editable
      }
    };

    const load = async () => {
      try {
        setLoading(true);
        const data = await poTransactionReceiptsApi.getById(id);
        if (!data?.receipt) {
          toast({ title: 'Error', description: 'Receipt not found', variant: 'destructive' });
          router.push('/purchase-orders/transaction-receipts');
          return;
        }
        setForm({
          po_header_id: String(data.receipt.po_header_id),
          interface_line_number: data.receipt.interface_line_number || '',
          transaction_type: data.receipt.transaction_type || 'deliver',
          transaction_date: data.receipt.transaction_date
            ? new Date(data.receipt.transaction_date).toISOString().slice(0, 16)
            : getCurrentDateTimeLocal(),
          source_document_code: data.receipt.source_document_code || 'PO',
          receipt_source_code: data.receipt.receipt_source_code || 'Vendor',
          parent_transaction_id: data.receipt.parent_transaction_id || '',
          organization_code: data.receipt.organization_code || '',
          document_number: data.receipt.document_number || '',
          document_line_number: data.receipt.document_line_number || '1',
          document_schedule_number: data.receipt.document_schedule_number || '1',
          business_unit: data.receipt.business_unit || 'ev Ltd.',
          sub_inventory: data.receipt.sub_inventory || 'prod',
          uom: data.receipt.uom || '',
        });
        setLots((data.lots || []).map(l => ({ ...l })));
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to load receipt', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(id)) {
      loadDropdownData();
      load();
    }
  }, [id, router, toast]);

  const updateLot = (index: number, field: keyof ILotForm, value: string) => {
    const next = [...lots];
    next[index] = { ...next[index], [field]: value };
    setLots(next);
  };

  const addLot = () => {
    setLots(prev => [
      ...prev,
      {
        po_header_id: Number(form.po_header_id),
        item_number: '',
        lot_number: '',
        transaction_quantity: 0,
        expired_date: '',
      },
    ]);
  };

  const removeLot = (index: number) => {
    const next = [...lots];
    if (next[index]?.id) {
      next[index] = { ...next[index], _deleted: true };
    } else {
      next.splice(index, 1);
    }
    setLots(next);
  };

  const handleSave = async () => {
    try {
      if (
        lots.some(
          l =>
            !l._deleted &&
            (!l.po_header_id || !l.item_number || !l.lot_number || !l.transaction_quantity),
        )
      ) {
        toast({
          title: 'Validation Error',
          description: 'Each lot needs PO header id, item number, lot number and quantity',
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);
      const lotsPayload = lots
        .filter(l => l._deleted || l.item_number || l.lot_number || l.transaction_quantity)
        .map(lot => {
          if (lot._deleted && lot.id) return { id: lot.id, _action: 'delete' as const };
          if (lot.id) {
            return {
              id: lot.id,
              _action: 'update' as const,
              po_header_id: Number(lot.po_header_id),
              item_number: Number(lot.item_number),
              lot_number: lot.lot_number,
              transaction_quantity: lot.transaction_quantity ? Number(lot.transaction_quantity) : 0,
              expired_date: lot.expired_date ? new Date(String(lot.expired_date)).toISOString() : null,
            };
          }
          return {
            _action: 'create' as const,
            po_header_id: Number(lot.po_header_id),
            item_number: Number(lot.item_number),
            lot_number: lot.lot_number || '',
            transaction_quantity: lot.transaction_quantity ? Number(lot.transaction_quantity) : 0,
            expired_date: lot.expired_date ? new Date(String(lot.expired_date)).toISOString() : null,
          };
        });

      await poTransactionReceiptsApi.updateWithLots(id, {
        receipt: {
          po_header_id: Number(form.po_header_id),
          transaction_type: form.transaction_type || 'deliver',
          transaction_date: form.transaction_date ? new Date(form.transaction_date).toISOString() : null,
          source_document_code: form.source_document_code || 'PO',
          receipt_source_code: form.receipt_source_code || 'Vendor',
          parent_transaction_id: form.parent_transaction_id || null,
          organization_code: form.organization_code || null,
          document_number: form.document_number || null,
          document_line_number: form.document_line_number || '1',
          document_schedule_number: form.document_schedule_number || '1',
          business_unit: form.business_unit || 'ev Ltd.',
          sub_inventory: form.sub_inventory || 'prod',
          uom: form.uom || null,
        },
        lots: lotsPayload,
      });
      toast({ title: 'Success', description: 'Receipt updated successfully' });
      router.push('/purchase-orders/transaction-receipts');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update receipt', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="py-16 flex justify-center"><div className="h-12 w-12 border-b-2 rounded-full animate-spin" /></div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Edit Receipt ${form.interface_line_number}`}
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Purchase Orders', href: '/purchase-orders' },
            { label: 'Transaction Receipts', href: '/purchase-orders/transaction-receipts' },
            { label: 'Edit', href: `/purchase-orders/transaction-receipts/${id}/edit` },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Update Receipt</CardTitle>
              <Button variant="outline" onClick={() => router.push('/purchase-orders/transaction-receipts')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>PO Header ID</Label>
                <Select
                  value={form.po_header_id}
                  onValueChange={value => setForm(prev => ({ ...prev, po_header_id: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map(po => (
                      <SelectItem key={po.po_header_id} value={String(po.po_header_id)}>
                        {po.po_number} ({po.po_header_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction Type</Label>
                <Input value={form.transaction_type} onChange={e => setForm(prev => ({ ...prev, transaction_type: e.target.value }))} />
              </div>
              <div>
                <Label>Transaction Date</Label>
                <Input type="datetime-local" value={form.transaction_date} onChange={e => setForm(prev => ({ ...prev, transaction_date: e.target.value }))} />
              </div>
              <div>
                <Label>UOM</Label>
                <Input value={form.uom} onChange={e => setForm(prev => ({ ...prev, uom: e.target.value }))} />
              </div>
              <div>
                <Label>Source Document Code</Label>
                <Input value={form.source_document_code} onChange={e => setForm(prev => ({ ...prev, source_document_code: e.target.value }))} />
              </div>
              <div>
                <Label>Receipt Source Code</Label>
                <Input value={form.receipt_source_code} onChange={e => setForm(prev => ({ ...prev, receipt_source_code: e.target.value }))} />
              </div>
              <div>
                <Label>Parent Transaction ID</Label>
                <Input value={form.parent_transaction_id} onChange={e => setForm(prev => ({ ...prev, parent_transaction_id: e.target.value }))} />
              </div>
              <div>
                <Label>Organization Code</Label>
                <Input value={form.organization_code} onChange={e => setForm(prev => ({ ...prev, organization_code: e.target.value }))} />
              </div>
              <div>
                <Label>Document Number</Label>
                <Input value={form.document_number} onChange={e => setForm(prev => ({ ...prev, document_number: e.target.value }))} />
              </div>
              <div>
                <Label>Document Line Number</Label>
                <Input value={form.document_line_number} onChange={e => setForm(prev => ({ ...prev, document_line_number: e.target.value }))} />
              </div>
              <div>
                <Label>Document Schedule Number</Label>
                <Input value={form.document_schedule_number} onChange={e => setForm(prev => ({ ...prev, document_schedule_number: e.target.value }))} />
              </div>
              <div>
                <Label>Business Unit</Label>
                <Input value={form.business_unit} onChange={e => setForm(prev => ({ ...prev, business_unit: e.target.value }))} />
              </div>
              <div>
                <Label>Sub Inventory</Label>
                <Input value={form.sub_inventory} onChange={e => setForm(prev => ({ ...prev, sub_inventory: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Lot Details</Label>
                <Button type="button" onClick={addLot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lot
                </Button>
              </div>
              {lots.filter(l => !l._deleted).map((lot, index) => (
                <Card key={`${lot.id || 'new'}-${index}`}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <Label>PO Header ID *</Label>
                        <Input
                          type="number"
                          value={lot.po_header_id != null ? String(lot.po_header_id) : ''}
                          onChange={e => updateLot(index, 'po_header_id', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Item Number *</Label>
                        <Select
                          value={lot.item_number != null ? String(lot.item_number) : ''}
                          onValueChange={value => updateLot(index, 'item_number', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemOptions.map(item => (
                              <SelectItem key={item.item} value={String(item.item)}>
                                {item.item} {item.description ? `- ${item.description}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Lot Number</Label>
                        <Input value={lot.lot_number || ''} onChange={e => updateLot(index, 'lot_number', e.target.value)} />
                      </div>
                      <div>
                        <Label>Transaction Quantity</Label>
                        <Input
                          type="number"
                          value={lot.transaction_quantity != null ? String(lot.transaction_quantity) : ''}
                          onChange={e => updateLot(index, 'transaction_quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Expired Date</Label>
                        <Input
                          type="datetime-local"
                          value={lot.expired_date ? new Date(String(lot.expired_date)).toISOString().slice(0, 16) : ''}
                          onChange={e => updateLot(index, 'expired_date', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" className="text-red-600" onClick={() => removeLot(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => router.push('/purchase-orders/transaction-receipts')}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

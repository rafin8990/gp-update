"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { poCodesApi, IPoCode } from '@/lib/api/po-codes';

export default function EditPoCodePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const idParam = params?.id;
  const poCodeId = idParam ? Number(idParam) : null;
  const isValidId = typeof poCodeId === 'number' && !Number.isNaN(poCodeId) && poCodeId > 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [poCode, setPoCode] = useState<IPoCode | null>(null);
  const [formData, setFormData] = useState({
    serial_start: '',
    serial_end: '',
    quantity: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isValidId || !poCodeId) {
      toast({
        title: 'Invalid PO code',
        description: 'The requested PO code could not be found.',
        variant: 'destructive',
      });
      router.push('/po-hex-codes');
      return;
    }

    const fetchPoCode = async () => {
      try {
        setLoading(true);
        const data = await poCodesApi.getById(poCodeId);
        setPoCode(data);
        setFormData({
          serial_start: data.serial_start ? String(data.serial_start) : '',
          serial_end: data.serial_end ? String(data.serial_end) : '',
          quantity: data.quantity != null ? String(data.quantity) : '',
        });
      } catch (error: any) {
        console.error('Error fetching PO code:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch PO code',
          variant: 'destructive',
        });
        router.push('/po-hex-codes');
      } finally {
        setLoading(false);
      }
    };

    fetchPoCode();
  }, [isValidId, poCodeId, router, toast]);

  const validate = () => {
    const errors: Record<string, string> = {};

    const hasSerialStart = !!formData.serial_start.trim();
    const hasSerialEnd = !!formData.serial_end.trim();

    if (hasSerialStart !== hasSerialEnd) {
      errors.serial_start = 'Provide both serial start and serial end or leave both empty';
      errors.serial_end = 'Provide both serial start and serial end or leave both empty';
    }

    if (hasSerialStart && hasSerialEnd) {
      try {
        const start = BigInt(formData.serial_start.trim());
        const end = BigInt(formData.serial_end.trim());
        if (start > end) {
          errors.serial_start = 'Serial start must be less than or equal to serial end';
        }
      } catch {
        errors.serial_start = 'Serial numbers must be valid integers';
      }
    }

    if (formData.quantity.trim()) {
      try {
        const qty = BigInt(formData.quantity.trim());
        if (qty < BigInt(0)) {
          errors.quantity = 'Quantity must be positive';
        }
      } catch {
        errors.quantity = 'Quantity must be a valid integer';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!isValidId || !poCodeId) return;
    if (!validate()) return;

    try {
      setSaving(true);

      // Build update payload
      const payload: any = {};

      if (formData.serial_start.trim() && formData.serial_end.trim()) {
        payload.serial_start = formData.serial_start.trim();
        payload.serial_end = formData.serial_end.trim();
      } else {
        payload.serial_start = null;
        payload.serial_end = null;
      }

      if (formData.quantity.trim()) {
        payload.quantity = Number(BigInt(formData.quantity.trim()));
      } else {
        payload.quantity = null;
      }

      const updated = await poCodesApi.update(poCodeId, payload);
      setPoCode(updated);

      toast({
        title: 'Success',
        description: 'PO code updated successfully',
      });
      router.push('/po-hex-codes');
    } catch (error: any) {
      console.error('Error updating PO code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update PO code',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !poCode) {
    return (
      <PageLayout activePage="po-hex-codes">
        <div className="flex items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="po-hex-codes">
      <div className="space-y-6">
        <PageHeader
          title={`Edit PO Code ${poCode.rfid_code}`}
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'PO Codes', href: '/po-hex-codes' },
            { label: 'Edit', href: `/po-hex-codes/${poCode.id}/edit` },
          ]}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/po-hex-codes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Button>
          <div className="rounded-lg border border-dashed border-muted-foreground/40 px-4 py-2 text-sm">
            Editing record #{poCode.id}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update PO Code</CardTitle>
            <CardDescription>
              Adjust the serial range and quantity. RFID code, PO header, and item are read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">RFID Code</Label>
                <div className="mt-1 rounded border bg-muted px-2 py-1 font-mono text-sm">
                  {poCode.rfid_code}
                </div>
              </div>
              <div>
                <Label className="text-xs">PO Header ID</Label>
                <div className="mt-1 rounded border bg-muted px-2 py-1 text-sm">
                  {poCode.po_header_id}
                </div>
              </div>
              <div>
                <Label className="text-xs">Item ID</Label>
                <div className="mt-1 rounded border bg-muted px-2 py-1 text-sm">
                  {poCode.item_id}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="serial_start" className="text-xs">Serial Start</Label>
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
                  placeholder="Enter serial start"
                  className={formErrors.serial_start ? 'border-red-500' : ''}
                />
                {formErrors.serial_start && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.serial_start}</p>
                )}
              </div>
              <div>
                <Label htmlFor="serial_end" className="text-xs">Serial End</Label>
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
                  placeholder="Enter serial end"
                  className={formErrors.serial_end ? 'border-red-500' : ''}
                />
                {formErrors.serial_end && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.serial_end}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="quantity" className="text-xs">Quantity (Optional)</Label>
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
                  className={formErrors.quantity ? 'border-red-500' : ''}
                />
                {formErrors.quantity && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.quantity}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <Button variant="outline" onClick={() => router.push('/po-hex-codes')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}


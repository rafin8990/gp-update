"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { requisitionsApi, CreateRequisitionData, IRequisitionItem } from '@/lib/api/requisitions'
import { itemsApi, IItem, getErpItemNumber, getErpItemDisplayLabel } from '@/lib/api/items'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CreateFormState = Omit<CreateRequisitionData, 'items'> & {
  description: string
}

const emptyLine = (): Omit<IRequisitionItem, 'id' | 'requisition_id' | 'item_description'> & {
  quantity: number | string
} => ({
  item_number: '',
  quantity: 0,
  uom: '',
  item_type: '',
  source_subinventory: '',
  source_location_code: '',
})

export default function CreateRequisitionPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateFormState>({
    requisition_number: '',
    source_order: '',
    distribution_partner_name: '',
    address: '',
    organization_code: '',
    description: '',
    status: 'pending',
    transport_type_1: '',
    transport_type_2: '',
    vehicle_1: '',
    vehicle_2: '',
  })
  const [items, setItems] = useState<
    Array<Omit<IRequisitionItem, 'id' | 'requisition_id' | 'item_description'> & { quantity: number | string }>
  >([emptyLine()])

  const [availableItems, setAvailableItems] = useState<IItem[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await itemsApi.getAll({ page: 1, limit: 1000, item_status: 'active' })
        setAvailableItems(res.data)
      } catch {}
    })()
  }, [])

  const dropdownOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; item: IItem }> = []
    for (const it of availableItems) {
      const key = getErpItemNumber(it)
      opts.push({ key, label: getErpItemDisplayLabel(it), item: it })
    }
    return opts
  }, [availableItems])

  const setItem = (
    idx: number,
    key: keyof Omit<IRequisitionItem, 'id' | 'requisition_id' | 'item_description'>,
    value: unknown,
  ) => {
    setItems(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [key]: value } as (typeof copy)[number]
      return copy
    })
  }

  const addRow = () => setItems((prev) => [...prev, emptyLine()])
  const removeRow = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const onSubmit = async () => {
    if (!form.requisition_number.trim()) return
    if (!form.distribution_partner_name.trim()) return
    if (!form.address.trim()) return
    if (!form.organization_code.trim()) return
    if (items.length === 0) return
    const invalidLine = items.some((it) => !it.item_number?.trim() || Math.max(1, Number(it.quantity) || 0) < 1)
    if (invalidLine) return

    setSubmitting(true)
    try {
      const payload: CreateRequisitionData = {
        requisition_number: form.requisition_number.trim(),
        distribution_partner_name: form.distribution_partner_name.trim(),
        address: form.address.trim(),
        organization_code: form.organization_code.trim(),
        status: form.status,
        description: form.description.trim() ? form.description.trim() : null,
        ...(form.source_order.trim() ? { source_order: form.source_order.trim() } : {}),
        ...(form.transport_type_1.trim() ? { transport_type_1: form.transport_type_1.trim() } : {}),
        ...(form.transport_type_2.trim() ? { transport_type_2: form.transport_type_2.trim() } : {}),
        ...(form.vehicle_1.trim() ? { vehicle_1: form.vehicle_1.trim() } : {}),
        ...(form.vehicle_2.trim() ? { vehicle_2: form.vehicle_2.trim() } : {}),
        items: items.map((it) => ({
          item_number: it.item_number.trim(),
          uom: it.uom?.trim() || undefined,
          quantity: Math.max(1, Number(it.quantity) || 0),
          ...(it.item_type?.trim() ? { item_type: it.item_type.trim() } : {}),
          ...(it.source_subinventory?.trim() ? { source_subinventory: it.source_subinventory.trim() } : {}),
          ...(it.source_location_code?.trim() ? { source_location_code: it.source_location_code.trim() } : {}),
        })),
      }
      await requisitionsApi.create(payload)
      router.push('/requisitions')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout activePage="requisitions">
      <PageHeader
        title="Create Requisition"
        breadcrumbItems={[
          { label: 'Requisitions', href: '/requisitions' },
          { label: 'Create', href: '/requisitions/create' },
        ]}
      />

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-700">Requisition Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requisition Number *</Label>
                <Input placeholder="e.g. REQ-2025-001" value={form.requisition_number} onChange={(e) => setForm({ ...form, requisition_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Distribution Partner Name *</Label>
                <Input placeholder="e.g. ABC Distributors" value={form.distribution_partner_name} onChange={(e) => setForm({ ...form, distribution_partner_name: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address *</Label>
                <Input placeholder="Street, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Organization Code *</Label>
                <Input placeholder="e.g. ORG-001" value={form.organization_code} onChange={(e) => setForm({ ...form, organization_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Source order</Label>
                <Input
                  placeholder="Optional"
                  value={form.source_order ?? ''}
                  onChange={(e) => setForm({ ...form, source_order: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Transport type 1</Label>
                <Input
                  placeholder="Optional"
                  value={form.transport_type_1 ?? ''}
                  onChange={(e) => setForm({ ...form, transport_type_1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Transport type 2</Label>
                <Input
                  placeholder="Optional"
                  value={form.transport_type_2 ?? ''}
                  onChange={(e) => setForm({ ...form, transport_type_2: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle 1</Label>
                <Input placeholder="Optional" value={form.vehicle_1 ?? ''} onChange={(e) => setForm({ ...form, vehicle_1: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vehicle 2</Label>
                <Input placeholder="Optional" value={form.vehicle_2 ?? ''} onChange={(e) => setForm({ ...form, vehicle_2: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-base text-gray-700">Items</CardTitle>
            <Button type="button" onClick={addRow} className="bg-emerald-600 hover:bg-emerald-700">Add Item</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="space-y-3 p-3 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Select Item *</Label>
                      <Select
                        value={it.item_number || ''}
                        onValueChange={(val) => {
                          const found = dropdownOptions.find((o) => o.key === val)
                          if (!found) return
                          const num = getErpItemNumber(found.item)
                          const uomFromMaster = (found.item.primary_uom_code ?? '').trim()
                          setItems((prev) => {
                            const copy = [...prev]
                            const cur = copy[idx]
                            if (!cur) return prev
                            copy[idx] = {
                              ...cur,
                              item_number: num,
                              ...(uomFromMaster && !String(cur.uom ?? '').trim()
                                ? { uom: uomFromMaster }
                                : {}),
                            }
                            return copy
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={dropdownOptions.length ? 'Select item' : 'No items found'} />
                        </SelectTrigger>
                        <SelectContent>
                          {dropdownOptions.map((opt) => (
                            <SelectItem key={opt.key} value={opt.key}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={it.quantity === 0 ? '' : it.quantity}
                        onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>UOM</Label>
                      <Input placeholder="e.g. PCS (optional)" value={it.uom} onChange={(e) => setItem(idx, 'uom', e.target.value)} />
                    </div>
                    <div className="flex items-end justify-end">
                      <Button type="button" variant="secondary" onClick={() => removeRow(idx)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Item type</Label>
                      <Input
                        placeholder="Optional"
                        value={it.item_type ?? ''}
                        onChange={(e) => setItem(idx, 'item_type', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Source subinventory</Label>
                      <Input
                        placeholder="Optional"
                        value={it.source_subinventory ?? ''}
                        onChange={(e) => setItem(idx, 'source_subinventory', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Source location code</Label>
                      <Input
                        placeholder="Optional"
                        value={it.source_location_code ?? ''}
                        onChange={(e) => setItem(idx, 'source_location_code', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button variant="secondary" onClick={() => router.push('/requisitions')}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? 'Creating...' : 'Create Requisition'}</Button>
        </div>
      </div>
    </PageLayout>
  )
}



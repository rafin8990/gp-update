"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { requisitionsApi, UpdateRequisitionData, IRequisitionItem } from '@/lib/api/requisitions'
import { itemsApi, IItem } from '@/lib/api/items'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function EditRequisitionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<UpdateRequisitionData>({})
  const [items, setItems] = useState<Array<
    Omit<IRequisitionItem, 'id' | 'requisition_id'> & { quantity: number | string }
  >>([])
  const [availableItems, setAvailableItems] = useState<IItem[]>([])

  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await requisitionsApi.getById(Number(params.id))
        setForm({
          requisition_number: data.requisition_number,
          distribution_partner_name: data.distribution_partner_name,
          address: data.address,
          organization_code: data.organization_code,
          description: data.description ?? null,
          status: data.status,
        })
        setItems((data.items || []).map(i => ({ item_number: i.item_number, quantity: i.quantity ?? '', uom: i.uom })))
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

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
      const key = it.item_number
      const label = `${it.item_number} (${it.item_description || 'N/A'})`
      opts.push({ key, label, item: it })
    }
    return opts
  }, [availableItems])

  const setItem = (
    idx: number,
    key: keyof Omit<IRequisitionItem, 'id' | 'requisition_id'>,
    value: any
  ) => {
    setItems(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [key]: key === 'quantity' ? value : value }
      return copy
    })
  }

  const addRow = () => setItems(prev => [...prev, { item_number: '', epc: '', quantity: 1, uom: '' }])
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const onSubmit = async () => {
    if (!params?.id) return
    setSubmitting(true)
    try {
      const payload: UpdateRequisitionData = {
        ...form,
        items: items.map(it => ({
          item_number: it.item_number,
          uom: it.uom,
          quantity: Math.max(1, Number(it.quantity) || 0),
        })),
      }
      await requisitionsApi.update(Number(params.id), payload)
      router.push('/requisitions')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout activePage="requisitions">
      <PageHeader
        title="Edit Requisition"
        breadcrumbItems={[
          { label: 'Requisitions', href: '/requisitions' },
          { label: 'Edit', href: `/requisitions/${params?.id}/edit` },
        ]}
      />

      {loading ? (
        <div className="py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Requisition Number *</Label>
              <Input value={form.requisition_number || ''} onChange={(e) => setForm({ ...form, requisition_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Distribution Partner Name *</Label>
              <Input value={form.distribution_partner_name || ''} onChange={(e) => setForm({ ...form, distribution_partner_name: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address *</Label>
              <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Organization Code *</Label>
              <Input value={form.organization_code || ''} onChange={(e) => setForm({ ...form, organization_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Items</h3>
              <Button type="button" onClick={addRow}>Add Item</Button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Select Item</Label>
                    <Select
                      value={it.item_number || ''}
                      onValueChange={(val) => {
                        const found = dropdownOptions.find(o => o.key === val)
                        if (found) {
                          setItem(idx, 'item_number', found.item.item_number)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dropdownOptions.length ? 'Select item' : 'No items found'} />
                      </SelectTrigger>
                      <SelectContent>
                        {dropdownOptions.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity === 0 ? '' : (it.quantity as any)}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>UOM *</Label>
                    <Input value={it.uom} onChange={(e) => setItem(idx, 'uom', e.target.value)} />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button type="button" variant="secondary" onClick={() => removeRow(idx)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/requisitions')}>Cancel</Button>
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? 'Updating...' : 'Update Requisition'}</Button>
          </div>
        </>
      )}
    </PageLayout>
  )
}



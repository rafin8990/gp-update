"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { packsApi, IPackItem } from '@/lib/api/packs'
import { requisitionsApi, IRequisition, IRequisitionWithItems } from '@/lib/api/requisitions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inboundApi, IInboundRecord } from '@/lib/api/inbound'
import { useToast } from '@/hooks/use-toast'

export default function CreatePackPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [requisitionId, setRequisitionId] = useState('')
  const [requisitions, setRequisitions] = useState<IRequisition[]>([])
  const [selectedRequisition, setSelectedRequisition] = useState<IRequisitionWithItems | null>(null)
  const [inbounds, setInbounds] = useState<IInboundRecord[]>([])
  const [packedGlobalEpcs, setPackedGlobalEpcs] = useState<Set<string>>(new Set())
  const [packedCurrentEpcs, setPackedCurrentEpcs] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<Array<Omit<IPackItem,'requisition_pack_id'>>>([])

  const setItem = (idx: number, key: keyof Omit<IPackItem,'requisition_pack_id'>, value: any) => {
    setItems(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], [key]: value }; return copy })
  }
  const addRow = () => setItems(prev => prev) // not used in FIFO mode
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  useEffect(() => {
    ;(async () => {
      try {
        const res = await requisitionsApi.getAll({ page: 1, limit: 100 })
        setRequisitions(res.data)
      } catch {}
    })()
  }, [])

  const requisitionOptions = useMemo(() => {
    return requisitions.map(r => ({ key: String(r.id), label: `${r.requisition_number} (${r.distribution_partner_name})` }))
  }, [requisitions])

  // When requisition changes, load details and inbound FIFO lists
  useEffect(() => {
    ;(async () => {
      if (!requisitionId) { setSelectedRequisition(null); return }
      try {
        const [req, inboundRes, packsForReq, packsAll] = await Promise.all([
          requisitionsApi.getById(Number(requisitionId)),
          inboundApi.getAll({ page: 1, limit: 500 }),
          packsApi.getAll({ requisition_id: Number(requisitionId), page: 1, limit: 1000 }),
          packsApi.getAll({ page: 1, limit: 10000 })
        ])
        setSelectedRequisition(req)
        // Sort inbound records by received_at/created_at ASC for FIFO
        const sorted = (inboundRes.data || []).slice().sort((a,b) => {
          const ad = new Date(a.received_at || a.created_at || '').getTime() || 0
          const bd = new Date(b.received_at || b.created_at || '').getTime() || 0
          return ad - bd
        })
        setInbounds(sorted)

        // Compute packed EPCs
        const current = new Set<string>()
        for (const p of packsForReq.data || []) {
          for (const it of p.items || []) current.add(it.epc)
        }
        setPackedCurrentEpcs(current)

        const global = new Set<string>()
        for (const p of packsAll.data || []) {
          for (const it of p.items || []) global.add(it.epc)
        }
        setPackedGlobalEpcs(global)

        // Prefill selected items with current requisition packed EPCs
        const prefill: Array<Omit<IPackItem,'requisition_pack_id'>> = []
        const reqItemSet = new Set((req.items || []).map(i => i.item_number))
        for (const rec of sorted) {
          for (const it of rec.items) {
            if (!reqItemSet.has(it.item_number)) continue
            if (current.has(it.epc)) prefill.push({ item_number: it.item_number, epc: it.epc })
          }
        }
        setItems(prefill)
      } catch {}
    })()
  }, [requisitionId])

  // Build selectable EPC lists per required item from requisition
  const fifoOptionsByItem = useMemo(() => {
    const map: Record<string, Array<{ epc: string; quantity: number; po_number: string; item_description?: string }>> = {}
    if (!selectedRequisition) return map
    const requiredItems = new Set((selectedRequisition.items || []).map(i => i.item_number))
    for (const rec of inbounds) {
      for (const it of rec.items) {
        if (!requiredItems.has(it.item_number)) continue
        // Exclude EPCs already packed in any requisition, unless it's already packed for this requisition (to display as selected)
        if (packedGlobalEpcs.has(it.epc) && !packedCurrentEpcs.has(it.epc)) continue
        if (!map[it.item_number]) map[it.item_number] = []
        map[it.item_number].push({ epc: it.epc, quantity: it.quantity, po_number: rec.po_number, item_description: it.item_description })
      }
    }
    return map
  }, [selectedRequisition, inbounds, packedGlobalEpcs, packedCurrentEpcs])

  const onSubmit = async () => {
    if (!requisitionId) { toast({ title: 'Validation', description: 'Requisition ID is required', variant: 'destructive' }); return }
    if (items.length === 0) { toast({ title: 'Validation', description: 'At least one item is required', variant: 'destructive' }); return }
    for (let i=0;i<items.length;i++) {
      if (!items[i].item_number || !items[i].epc) {
        toast({ title: 'Validation', description: `Row ${i+1}: item_number and epc required`, variant: 'destructive' });
        return
      }
    }
    setSubmitting(true)
    try {
      await packsApi.create({ requisition_id: Number(requisitionId), items })
      toast({ title: 'Success', description: 'Pack created' })
      router.push('/packs')
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout activePage="packs">
      <PageHeader
        title="Create Pack"
        breadcrumbItems={[{ label: 'Pack Items', href: '/packs' }, { label: 'Create', href: '/packs/create' }]}
      />

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Requisition *</Label>
            <Select value={requisitionId} onValueChange={setRequisitionId}>
              <SelectTrigger>
                <SelectValue placeholder={requisitionOptions.length ? 'Select requisition' : 'No requisitions found'} />
              </SelectTrigger>
              <SelectContent>
                {requisitionOptions.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">FIFO Inbound Items</h3>
            <div className="text-xs text-gray-600">Selected: <span className="font-semibold text-gray-800">{items.length}</span></div>
          </div>
          {!selectedRequisition ? (
            <div className="text-sm text-gray-500">Select a requisition to see available inbound items.</div>
          ) : (
            <div className="space-y-4">
              {(selectedRequisition.items || []).map(reqItem => {
                const options = fifoOptionsByItem[reqItem.item_number] || []
                const selectedForItem = items.filter(x => x.item_number === reqItem.item_number).map(x => x.epc)
                const selectedQty = options
                  .filter(o => selectedForItem.includes(o.epc))
                  .reduce((sum, o) => sum + Number(o.quantity || 0), 0)
                const requiredQty = Number(reqItem.quantity || 0)
                const isFulfilled = selectedQty >= requiredQty && requiredQty > 0
                return (
                  <div key={reqItem.item_number} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {reqItem.item_number} <span className="text-gray-500">(need {reqItem.quantity} {reqItem.uom})</span>
                        <span className="ml-2 text-xs text-gray-600">Selected RFID: <span className="font-semibold text-gray-800">{selectedForItem.length}</span></span>
                        <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${isFulfilled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          Qty {selectedQty} / {requiredQty}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">FIFO: earliest POs first</div>
                    </div>
                    {options.length === 0 ? (
                      <div className="text-xs text-gray-500">No inbound items available</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {options.map(opt => {
                          const key = `${reqItem.item_number}|${opt.epc}`
                          const checked = selectedForItem.includes(opt.epc)
                          return (
                            <label key={key} className={`flex items-start gap-2 p-2 border rounded hover:bg-white ${checked ? 'bg-white border-emerald-300' : 'bg-gray-100'}`}>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setItems(prev => {
                                      const exists = prev.some(x => x.item_number === reqItem.item_number && x.epc === opt.epc)
                                      return exists ? prev : [...prev, { item_number: reqItem.item_number, epc: opt.epc }]
                                    })
                                  } else {
                                    setItems(prev => prev.filter(x => !(x.item_number === reqItem.item_number && x.epc === opt.epc)))
                                  }
                                }}
                              />
                              <div className="text-xs">
                                <div className="text-gray-700">{opt.item_description || 'N/A'}</div>
                                <div className="text-gray-500">PO: {opt.po_number} • Qty: {opt.quantity} • RFID: <span className="font-semibold text-gray-800 font-mono">{opt.epc}</span></div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 pb-6">
          <Button variant="secondary" onClick={()=>router.push('/packs')}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting || !requisitionId || items.length === 0} title={!requisitionId ? 'Select a requisition' : items.length === 0 ? 'Select at least one EPC' : ''}>
            {submitting ? 'Creating...' : `Create Pack (${items.length} selected)`}
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}



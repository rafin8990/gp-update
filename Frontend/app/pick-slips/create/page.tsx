"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { pickSlipsApi, IPickSlipItem, IFifoEpcRow } from '@/lib/api/packs'
import { requisitionsApi, IRequisition, IRequisitionWithItems } from '@/lib/api/requisitions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type FifoOption = {
  epc: string
  quantity: string | null
  po_number: string
  item_description?: string
  serial_label: string
}

function formatSerial(s: IFifoEpcRow): string {
  if (s.serial_start == null && s.serial_end == null) return '—'
  if (s.serial_start != null && s.serial_end != null) {
    if (s.serial_start === s.serial_end) return s.serial_start
    return `${s.serial_start} – ${s.serial_end}`
  }
  return s.serial_start ?? s.serial_end ?? '—'
}

/** Show DB value verbatim; missing quantity in DB. */
function formatPoCodeQtyDisplay(q: string | null | undefined): string {
  if (q == null || String(q).trim() === '') return '—'
  return String(q).trim()
}

/** Sum `po_codes.quantity` for selected rows; null/empty counts as 0. */
function poCodeQtyToBigInt(q: string | null | undefined): bigint {
  if (q == null || String(q).trim() === '') return 0n
  const t = String(q).trim()
  try {
    if (t.includes('.')) {
      const i = t.split('.')[0]
      return i === '' || i === '-' ? 0n : BigInt(i)
    }
    return BigInt(t)
  } catch {
    return 0n
  }
}

export default function CreatePickSlipPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [requisitionId, setRequisitionId] = useState('')
  const [requisitions, setRequisitions] = useState<IRequisition[]>([])
  const [selectedRequisition, setSelectedRequisition] = useState<IRequisitionWithItems | null>(null)
  const [fifoByItem, setFifoByItem] = useState<Record<string, IFifoEpcRow[]>>({})
  const [fifoLoading, setFifoLoading] = useState(false)
  const [packedGlobalEpcs, setPackedGlobalEpcs] = useState<Set<string>>(new Set())
  const [packedCurrentEpcs, setPackedCurrentEpcs] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<Array<Omit<IPickSlipItem, 'requisition_pack_id'>>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await requisitionsApi.getAll({ page: 1, limit: 100 })
        setRequisitions(res.data)
      } catch {}
    })()
  }, [])

  const requisitionOptions = useMemo(() => {
    return requisitions.map((r) => ({
      key: String(r.id),
      label: `${r.requisition_number} (${r.distribution_partner_name})`,
    }))
  }, [requisitions])

  useEffect(() => {
    ;(async () => {
      if (!requisitionId) {
        setSelectedRequisition(null)
        setFifoByItem({})
        setItems([])
        return
      }
      setFifoLoading(true)
      try {
        const [req, slipsForReq, slipsAll] = await Promise.all([
          requisitionsApi.getById(Number(requisitionId)),
          pickSlipsApi.getAll({ requisition_id: Number(requisitionId), page: 1, limit: 1000 }),
          pickSlipsApi.getAll({ page: 1, limit: 10000 }),
        ])
        setSelectedRequisition(req)

        const current = new Set<string>()
        for (const p of slipsForReq.data || []) {
          for (const it of p.items || []) current.add(it.epc)
        }
        setPackedCurrentEpcs(current)

        const global = new Set<string>()
        for (const p of slipsAll.data || []) {
          for (const it of p.items || []) global.add(it.epc)
        }
        setPackedGlobalEpcs(global)

        const fifoMap: Record<string, IFifoEpcRow[]> = {}
        for (const line of req.items || []) {
          try {
            const fr = await pickSlipsApi.getFifoEpcs(line.item_number, 1000)
            fifoMap[line.item_number] = fr.data ?? []
          } catch {
            fifoMap[line.item_number] = []
          }
        }
        setFifoByItem(fifoMap)

        const prefill: Array<Omit<IPickSlipItem, 'requisition_pack_id'>> = []
        const reqItemSet = new Set((req.items || []).map((i) => i.item_number))
        for (const itemNo of reqItemSet) {
          for (const row of fifoMap[itemNo] || []) {
            if (current.has(row.epc)) prefill.push({ item_number: itemNo, epc: row.epc })
          }
        }
        setItems(prefill)
      } catch (e: any) {
        toast({ title: 'Load failed', description: e?.message || 'Could not load requisition', variant: 'destructive' })
      } finally {
        setFifoLoading(false)
      }
    })()
  }, [requisitionId, toast])

  const fifoOptionsByItem = useMemo(() => {
    const map: Record<string, FifoOption[]> = {}
    if (!selectedRequisition) return map
    const requiredItems = new Set((selectedRequisition.items || []).map((i) => i.item_number))
    for (const itemNo of requiredItems) {
      const rows = fifoByItem[itemNo] || []
      const desc = selectedRequisition.items?.find((i) => i.item_number === itemNo)?.item_description
      map[itemNo] = rows
        .filter((r) => !packedGlobalEpcs.has(r.epc) || packedCurrentEpcs.has(r.epc))
        .map((r) => ({
          epc: r.epc,
          quantity: r.quantity != null && String(r.quantity).trim() !== '' ? String(r.quantity).trim() : null,
          po_number: r.stock_po_number,
          item_description: desc,
          serial_label: formatSerial(r),
        }))
    }
    return map
  }, [selectedRequisition, fifoByItem, packedGlobalEpcs, packedCurrentEpcs])

  const totalSelectedPoQty = useMemo(() => {
    let sum = 0n
    for (const it of items) {
      const opts = fifoOptionsByItem[it.item_number] || []
      const row = opts.find((o) => o.epc === it.epc)
      if (row) sum += poCodeQtyToBigInt(row.quantity)
    }
    return sum.toString()
  }, [items, fifoOptionsByItem])

  const onSubmit = async () => {
    if (!requisitionId) {
      toast({ title: 'Validation', description: 'Requisition is required', variant: 'destructive' })
      return
    }
    if (items.length === 0) {
      toast({ title: 'Validation', description: 'At least one RFID is required', variant: 'destructive' })
      return
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_number || !items[i].epc) {
        toast({ title: 'Validation', description: `Row ${i + 1}: item and EPC required`, variant: 'destructive' })
        return
      }
    }
    setSubmitting(true)
    try {
      await pickSlipsApi.create({ requisition_id: Number(requisitionId), items })
      toast({ title: 'Success', description: 'Pick slip created' })
      router.push('/pick-slips')
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout activePage="pick-slips">
      <PageHeader
        title="Create pick slip"
        breadcrumbItems={[
          { label: 'Pick slips', href: '/pick-slips' },
          { label: 'Create', href: '/pick-slips/create' },
        ]}
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
                {requisitionOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">FIFO stock (PO / lot)</h3>
            <div className="text-xs text-gray-600">
              Selected qty (PO code):{' '}
              <span className="font-semibold text-gray-800">{totalSelectedPoQty}</span>
            </div>
          </div>
          {fifoLoading && <div className="text-sm text-gray-500">Loading FIFO tags…</div>}
          {!selectedRequisition ? (
            <div className="text-sm text-gray-500">Select a requisition to see available tags from stock.</div>
          ) : (
            <div className="space-y-4">
              {(selectedRequisition.items || []).map((reqItem) => {
                const options = fifoOptionsByItem[reqItem.item_number] || []
                const selectedForItem = items.filter((x) => x.item_number === reqItem.item_number).map((x) => x.epc)
                const selectedQtySumBig = selectedForItem.reduce((acc, epc) => {
                  const opt = options.find((o) => o.epc === epc)
                  return acc + poCodeQtyToBigInt(opt?.quantity)
                }, 0n)
                const selectedQtySum = selectedQtySumBig.toString()
                const requiredQty = Number(reqItem.quantity || 0)
                const requiredBig = BigInt(Math.max(0, Math.floor(requiredQty)))
                const isFulfilled = requiredQty > 0 && selectedQtySumBig >= requiredBig
                return (
                  <div key={reqItem.item_number} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {reqItem.item_number}{' '}
                        <span className="text-gray-500">
                          (need {reqItem.quantity} {reqItem.uom})
                        </span>
                        <span className="ml-2 text-xs text-gray-600">
                          Selected qty (PO code):{' '}
                          <span className="font-semibold text-gray-800">{selectedQtySum}</span>
                        </span>
                        <span
                          className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
                            isFulfilled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          Qty {selectedQtySum} / {requiredQty}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Oldest stock first</div>
                    </div>
                    {options.length === 0 ? (
                      <div className="text-xs text-gray-500">
                        No tags in stock for this item (or all already on another pick slip)
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {options.map((opt) => {
                          const key = `${reqItem.item_number}|${opt.epc}`
                          const checked = selectedForItem.includes(opt.epc)
                          return (
                            <label
                              key={key}
                              className={`flex items-start gap-2 p-2 border rounded hover:bg-white ${
                                checked ? 'bg-white border-emerald-300' : 'bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setItems((prev) => {
                                      const exists = prev.some(
                                        (x) => x.item_number === reqItem.item_number && x.epc === opt.epc,
                                      )
                                      return exists ? prev : [...prev, { item_number: reqItem.item_number, epc: opt.epc }]
                                    })
                                  } else {
                                    setItems((prev) =>
                                      prev.filter((x) => !(x.item_number === reqItem.item_number && x.epc === opt.epc)),
                                    )
                                  }
                                }}
                              />
                              <div className="text-xs">
                                <div className="text-gray-700">{opt.item_description || 'N/A'}</div>
                                <div className="text-gray-500">
                                  PO: {opt.po_number} • Serial: <span className="font-mono">{opt.serial_label}</span>
                                </div>
                                <div className="text-gray-600 font-mono text-[11px] mt-0.5">
                                  RFID: {opt.epc}
                                  <span className="text-gray-500 font-sans ml-1.5">
                                    • Box qty (PO code):{' '}
                                    <span className="font-semibold text-gray-700">{formatPoCodeQtyDisplay(opt.quantity)}</span>
                                  </span>
                                </div>
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
          <Button variant="secondary" onClick={() => router.push('/pick-slips')}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !requisitionId || items.length === 0}
            title={
              !requisitionId ? 'Select a requisition' : items.length === 0 ? 'Select at least one EPC' : ''
            }
          >
            {submitting
              ? 'Creating...'
              : `Create pick slip (qty ${totalSelectedPoQty}${items.length ? `, ${items.length} RFID` : ''})`}
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { packsApi, IPack } from '@/lib/api/packs'
import { requisitionsApi, IRequisition } from '@/lib/api/requisitions'
import { inboundApi, IInboundRecord } from '@/lib/api/inbound'
import { Download, Package } from 'lucide-react'

export default function PackViewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pack, setPack] = useState<IPack | null>(null)
  const [requisition, setRequisition] = useState<IRequisition | null>(null)
  const [inbounds, setInbounds] = useState<IInboundRecord[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      setLoading(true)
      try {
        const p = await packsApi.getById(Number(params.id))
        setPack(p)
        if (p.requisition_id) {
          const req = await requisitionsApi.getById(p.requisition_id)
          setRequisition(req)
        }
        const inboundRes = await inboundApi.getAll({ page: 1, limit: 5000 })
        setInbounds(inboundRes.data || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

  const epcInfoMap = useMemo(() => {
    const map = new Map<string, { quantity: number; po_number: string; item_description?: string }>()
    for (const rec of inbounds) {
      for (const it of rec.items) {
        // if multiple entries for same EPC, prefer earliest; we won't override if exists
        if (!map.has(it.epc)) {
          map.set(it.epc, { quantity: Number(it.quantity || 0), po_number: rec.po_number, item_description: it.item_description })
        }
      }
    }
    return map
  }, [inbounds])

  const itemsWithDetails = useMemo(() => {
    const arr = (pack?.items || []).map(it => {
      const info = epcInfoMap.get(it.epc)
      return {
        ...it,
        quantity: info?.quantity ?? 0,
        po_number: info?.po_number ?? '-',
        item_description: info?.item_description ?? undefined,
      }
    })
    // group by item_number to sum quantity
    const totals = arr.reduce((acc, it) => {
      acc[it.item_number] = (acc[it.item_number] || 0) + Number(it.quantity || 0)
      return acc
    }, {} as Record<string, number>)
    return { items: arr, totals }
  }, [pack, epcInfoMap])

  const handleDownload = async () => {
    if (!pack) return
    const jsPDF = (await import('jspdf')).default
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()

    // Header
    pdf.setFillColor(16,185,129)
    pdf.rect(0, 0, pageWidth, 30, 'F')
    pdf.setTextColor(255,255,255)
    pdf.setFontSize(16)
    pdf.text('Pack Items', 14, 18)
    pdf.setFontSize(10)
    if (requisition) {
      pdf.text(`Requisition: ${requisition.requisition_number}`, pageWidth - 14, 12, { align: 'right' })
      pdf.text(`${requisition.distribution_partner_name}`, pageWidth - 14, 18, { align: 'right' })
    }

    // Table
    let y = 40
    pdf.setTextColor(0,0,0)
    pdf.setFontSize(11)
    const colX = { item: 14, desc: 60, epc: 130, qty: 170 }
    pdf.text('Item Number', colX.item, y)
    pdf.text('Description', colX.desc, y)
    pdf.text('RFID', colX.epc, y)
    pdf.text('Qty', colX.qty, y)
    y += 6
    pdf.setDrawColor(200,200,200)
    pdf.line(14, y, pageWidth-14, y)
    y += 4

    for (const it of itemsWithDetails.items) {
      pdf.setFontSize(10)
      // Prepare wrapped description
      const desc = String(it.item_description || '-')
      const descLines = pdf.splitTextToSize(desc, 60)
      const lineHeight = 5
      const rowHeight = Math.max(descLines.length * lineHeight, 6)
      // Page break if needed (keep some margin)
      if (y + rowHeight > 280) { pdf.addPage(); y = 20 }

      // Draw first line cells
      pdf.text(String(it.item_number || '-'), colX.item, y)
      pdf.text(String(it.epc || '-'), colX.epc, y)
      pdf.text(String(it.quantity ?? 0), colX.qty, y)
      // Draw description lines
      let dy = 0
      for (const ln of descLines) {
        pdf.text(ln, colX.desc, y + dy)
        dy += lineHeight
      }
      y += rowHeight
    }

    // Totals
    y += 4
    pdf.setFontSize(11)
    pdf.text('Totals by Item:', 14, y)
    y += 6
    Object.entries(itemsWithDetails.totals).forEach(([item, qty]) => {
      if (y > 280) { pdf.addPage(); y = 20 }
      pdf.text(`${item}: ${qty}`, 14, y)
      y += 5
    })

    // Authorized signature section
    if (y < 240) {
      y = 240
    } else if (y > 260) {
      pdf.addPage();
      y = 240
    }
    pdf.setDrawColor(180,180,180)
    pdf.line(14, y + 20, 90, y + 20)
    pdf.setFontSize(10)
    pdf.setTextColor(120,120,120)
    pdf.text('Authorized Signature', 14, y + 26)
    pdf.setTextColor(0,0,0)

    const filename = requisition?.requisition_number ? `pack-${requisition.requisition_number}.pdf` : `pack-${pack.id}.pdf`
    pdf.save(filename)
  }

  return (
    <PageLayout activePage="packs">
      <PageHeader
        title={`Pack #${pack?.id ?? ''}`}
        breadcrumbItems={[{ label: 'Pack Items', href: '/packs' }, { label: 'View', href: `/packs/${params?.id}` }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/packs')}>Back</Button>
            <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2"/>Download</Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-8 text-gray-500">Loading...</div>
      ) : !pack ? (
        <div className="py-8 text-gray-500">Not found</div>
      ) : (
        <div ref={containerRef} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Requisition Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Requisition</div>
                <div className="font-medium">{requisition?.requisition_number || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Partner</div>
                <div className="font-medium">{requisition?.distribution_partner_name || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">Address</div>
                <div className="font-medium">{requisition?.address || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Packed Items</CardTitle>
              <Badge variant="secondary">{pack.items?.length || 0} EPCs</Badge>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>RFID</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithDetails.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-gray-400" />
                            <p>No items packed</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsWithDetails.items.map((it, idx) => (
                        <TableRow key={`${it.item_number}-${it.epc}-${idx}`}>
                          <TableCell className="font-mono text-sm">{it.item_number}</TableCell>
                          <TableCell className="text-sm">{it.item_description || '—'}</TableCell>
                          <TableCell className="font-mono font-semibold">{it.epc}</TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}



"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { pickSlipsApi, IPickSlip } from '@/lib/api/packs'
import { requisitionsApi, IRequisition } from '@/lib/api/requisitions'
import { Download, Package } from 'lucide-react'

export default function PickSlipViewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [slip, setSlip] = useState<IPickSlip | null>(null)
  const [requisition, setRequisition] = useState<IRequisition | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      setLoading(true)
      try {
        const p = await pickSlipsApi.getById(Number(params.id))
        setSlip(p)
        if (p.requisition_id) {
          const req = await requisitionsApi.getById(p.requisition_id)
          setRequisition(req)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

  const rows = useMemo(() => slip?.items || [], [slip])

  const handleDownload = async () => {
    if (!slip) return
    const jsPDF = (await import('jspdf')).default
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()

    pdf.setFillColor(16, 185, 129)
    pdf.rect(0, 0, pageWidth, 30, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.text('Pick slip', 14, 18)
    pdf.setFontSize(10)
    pdf.text(slip.pick_slip_number || `ID ${slip.id}`, pageWidth - 14, 12, { align: 'right' })
    if (requisition) {
      pdf.text(`Requisition: ${requisition.requisition_number}`, pageWidth - 14, 18, { align: 'right' })
    }

    let y = 40
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(11)
    const colX = { item: 14, desc: 52, po: 100, epc: 130, lot: 165 }
    pdf.text('Item', colX.item, y)
    pdf.text('Description', colX.desc, y)
    pdf.text('PO', colX.po, y)
    pdf.text('RFID', colX.epc, y)
    pdf.text('Lot', colX.lot, y)
    y += 6
    pdf.setDrawColor(200, 200, 200)
    pdf.line(14, y, pageWidth - 14, y)
    y += 4

    for (const it of rows) {
      pdf.setFontSize(9)
      const desc = String(it.item_description || '—')
      const descLines = pdf.splitTextToSize(desc, 42)
      const lineHeight = 4
      const rowHeight = Math.max(descLines.length * lineHeight, 6)
      if (y + rowHeight > 280) {
        pdf.addPage()
        y = 20
      }
      pdf.text(String(it.item_number || '-'), colX.item, y)
      pdf.text(String(it.stock_po_number || '-'), colX.po, y)
      pdf.text(String(it.epc || '-'), colX.epc, y)
      pdf.text(String(it.stock_lot_number || '-'), colX.lot, y)
      let dy = 0
      for (const ln of descLines) {
        pdf.text(ln, colX.desc, y + dy)
        dy += lineHeight
      }
      y += rowHeight
    }

    const filename = slip.pick_slip_number
      ? `${slip.pick_slip_number}.pdf`
      : requisition?.requisition_number
        ? `pick-slip-${requisition.requisition_number}.pdf`
        : `pick-slip-${slip.id}.pdf`
    pdf.save(filename)
  }

  return (
    <PageLayout activePage="pick-slips">
      <PageHeader
        title={slip?.pick_slip_number ? `Pick slip ${slip.pick_slip_number}` : `Pick slip #${slip?.id ?? ''}`}
        breadcrumbItems={[
          { label: 'Pick slips', href: '/pick-slips' },
          { label: 'View', href: `/pick-slips/${params?.id}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/pick-slips')}>
              Back
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-8 text-gray-500">Loading...</div>
      ) : !slip ? (
        <div className="py-8 text-gray-500">Not found</div>
      ) : (
        <div ref={containerRef} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pick slip</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Number</div>
                <div className="font-medium font-mono">{slip.pick_slip_number || `#${slip.id}`}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <Badge variant="outline" className="capitalize">
                  {slip.status || '—'}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-gray-500">Requisition</div>
                <div className="font-medium">{requisition?.requisition_number || `#${slip.requisition_id}`}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Partner</div>
                <div className="font-medium">{requisition?.distribution_partner_name || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">Address</div>
                <div className="font-medium">{requisition?.address || '—'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">EPCs</CardTitle>
              <Badge variant="secondary">{rows.length} RFID</Badge>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>RFID</TableHead>
                      <TableHead>Serial / note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-gray-400" />
                            <p>No EPCs on this slip</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((it, idx) => (
                        <TableRow key={`${it.epc}-${idx}`}>
                          <TableCell className="font-mono text-sm">{it.item_number}</TableCell>
                          <TableCell className="text-sm">{it.item_description || '—'}</TableCell>
                          <TableCell className="text-sm">{it.stock_po_number || '—'}</TableCell>
                          <TableCell className="text-sm">{it.stock_lot_number || '—'}</TableCell>
                          <TableCell className="font-mono font-semibold text-sm">{it.epc}</TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                            {it.serial_snapshot || '—'}
                          </TableCell>
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

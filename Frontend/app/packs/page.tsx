"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import Link from 'next/link'
import { packsApi, IPack, PackQueryParams } from '@/lib/api/packs'
import { RefreshCw, Plus, Edit, Trash2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PacksPage() {
  const [data, setData] = useState<IPack[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [meta, setMeta] = useState<any>(null)
  const [requisitionId, setRequisitionId] = useState('')
  const [itemNumber, setItemNumber] = useState('')
  const [epc, setEpc] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => { fetchData() }, [page, limit, requisitionId, itemNumber, epc])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params: PackQueryParams = { page, limit }
      if (requisitionId) params.requisition_id = Number(requisitionId)
      if (itemNumber) params.item_number = itemNumber
      if (epc) params.epc = epc
      const res = await packsApi.getAll(params)
      setData(res.data)
      setMeta(res.meta ?? null)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to load packs', variant: 'destructive' })
      setData([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pack?')) return
    setDeletingId(id)
    try {
      await packsApi.delete(id)
      toast({ title: 'Deleted', description: 'Pack deleted successfully' })
      fetchData()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageLayout activePage="packs">
      <PageHeader
        title="Pack Items"
        breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pack Items', href: '/packs' }]}
        actions={
          <Link href="/packs/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2"/>Create Pack</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Requisition ID" value={requisitionId} onChange={(e) => setRequisitionId(e.target.value)} />
          <Input placeholder="Item Number" value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} />
          <Input placeholder="EPC" value={epc} onChange={(e) => setEpc(e.target.value)} />
          <Button onClick={fetchData} disabled={loading} className="justify-self-start md:justify-self-auto"><RefreshCw className={`h-4 w-4 mr-2 ${loading?'animate-spin':''}`} />Refresh</Button>
        </CardContent>
      </Card>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SL</TableHead>
              <TableHead>Requisition</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">No packs found</TableCell></TableRow>
            ) : data.map((p, idx) => (
              <TableRow key={p.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{(meta?.page ? (meta.page - 1) * (meta.limit || limit) : 0) + idx + 1}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">#{p.requisition_id}</Badge>
                </TableCell>
                <TableCell>
                  {p.items && p.items.length > 0 ? (
                    <div className="text-sm text-gray-700">
                      {p.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-mono text-[12px] px-1.5 py-0.5 bg-gray-100 rounded">{it.item_number}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-[12px] text-gray-600">RFID: {it.epc}</span>
                        </div>
                      ))}
                      {p.items.length > 3 && <div className="text-xs text-gray-500">+{p.items.length - 3} more</div>}
                    </div>
                  ) : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/packs/${p.id}`}><Button variant="ghost" className="text-blue-700"><Eye className="h-4 w-4"/></Button></Link>
                    <Link href={`/packs/${p.id}/edit`}>
                      <Button variant="ghost" className={`text-emerald-700 ${p.requisition_status === 'complete' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={p.requisition_status === 'complete'}>
                        <Edit className="h-4 w-4"/>
                      </Button>
                    </Link>
                    <Button onClick={() => handleDelete(p.id!)} variant="ghost" className={`text-red-600 ${p.requisition_status === 'complete' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={deletingId === p.id || p.requisition_status === 'complete'}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">Showing {((meta.page-1)*meta.limit)+1} to {Math.min(meta.page*meta.limit, meta.total)} of {meta.total}</div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p-1))} disabled={!meta.hasPrev && meta.page<=1}>Previous</Button>
            <Button onClick={() => setPage(p => p+1)} disabled={!meta.hasNext && (meta.totalPages ? meta.page>=meta.totalPages : false)}>Next</Button>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </PageLayout>
  )
}



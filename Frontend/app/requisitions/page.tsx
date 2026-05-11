"use client"

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Edit, Plus, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { requisitionsApi, IRequisition, RequisitionQueryParams } from '@/lib/api/requisitions'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
} | null

const statusColors: Record<IRequisition['status'], string> = {
  pending: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  cancel: 'bg-red-100 text-red-800',
  received: 'bg-yellow-100 text-yellow-800',
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<IRequisition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | IRequisition['status']>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [meta, setMeta] = useState<Meta>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchRequisitions()
  }, [searchTerm, statusFilter, page, limit])

  const fetchRequisitions = async () => {
    try {
      setLoading(true)
      const params: RequisitionQueryParams = {
        searchTerm,
        page,
        limit,
      }
      if (statusFilter !== 'all') params.status = statusFilter

      const response = await requisitionsApi.getAll(params)
      setRequisitions(response.data)
      setMeta(response.meta ?? null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this requisition?')) return
    setDeletingId(id)
    try {
      await requisitionsApi.delete(id)
      toast({ title: 'Deleted', description: 'Requisition deleted successfully' })
      fetchRequisitions()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPage(1)
    setLimit(10)
  }

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <PageLayout activePage="requisitions">
      <PageHeader
        title="Requisitions"
        breadcrumbItems={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Requisitions", href: "/requisitions" }
        ]}
        actions={
          <Link href="/requisitions/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Requisition
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search requisitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="cancel">Cancel</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={resetFilters} disabled={loading}>Reset</Button>
        <Button onClick={fetchRequisitions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requisition #</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Org Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                    Loading requisitions...
                  </div>
                </TableCell>
              </TableRow>
            ) : requisitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No requisitions found
                </TableCell>
              </TableRow>
            ) : (
              requisitions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requisition_number}</TableCell>
                  <TableCell>{r.distribution_partner_name}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.address}>{r.address}</TableCell>
                  <TableCell>{r.organization_code}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[r.status]}> {r.status} </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/requisitions/${r.id}`}>
                        <Button className="text-blue-700 hover:text-blue-800 hover:bg-blue-50" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/requisitions/${r.id}/edit`}>
                        <Button className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button onClick={() => handleDelete(r.id!)} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={deletingId === r.id}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} results
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrev && meta.page <= 1}>Previous</Button>
            <Button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNext && (meta.totalPages ? meta.page >= meta.totalPages : false)}>Next</Button>
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

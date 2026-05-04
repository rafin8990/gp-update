// Usage: <DashboardAssetTable assets={assets} onEdit={onEdit} onDelete={onDelete} />
"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Asset } from "@/types/asset"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface DashboardAssetTableProps {
  assets?: Asset[]
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export function DashboardAssetTable({ assets = [], onEdit, onDelete }: DashboardAssetTableProps) {
  const [sortField, setSortField] = useState<keyof Asset>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const router = useRouter()

  const handleSort = (field: keyof Asset) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedAssets = [...assets].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === bValue) return 0
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    const comparison = aValue < bValue ? -1 : 1
    return sortDirection === "asc" ? comparison : -comparison
  })

  const handleView = (asset: Asset) => {
    router.push(`/assets/${asset.id}`)
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort("code")} className="cursor-pointer">
              Asset Code
            </TableHead>
            <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
              Name
            </TableHead>
            <TableHead onClick={() => handleSort("brand")} className="cursor-pointer">
              Brand
            </TableHead>
            <TableHead onClick={() => handleSort("branch")} className="cursor-pointer">
              Branch
            </TableHead>
            <TableHead onClick={() => handleSort("floor")} className="cursor-pointer">
              Floor
            </TableHead>
            <TableHead onClick={() => handleSort("department")} className="cursor-pointer">
              Department
            </TableHead>
            <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
              Status
            </TableHead>
            <TableHead onClick={() => handleSort("purchase_date")} className="cursor-pointer">
              Purchase Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.code}</TableCell>
              <TableCell>{asset.name}</TableCell>
              <TableCell>{asset.brand?.name || '-'}</TableCell>
              <TableCell>{asset.branch?.name || '-'}</TableCell>
              <TableCell>{asset.floor?.name || '-'}</TableCell>
              <TableCell>{asset.department?.name || '-'}</TableCell>
              <TableCell>
                <Badge variant={asset.status === "active" ? "default" : "secondary"}>
                  {asset.status}
                </Badge>
              </TableCell>
              <TableCell>
                {asset.purchase_date
                  ? format(new Date(asset.purchase_date), "MMM dd, yyyy")
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

"use client"

import { Search, Download, ClipboardCheck, Printer, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"
import { useDrawer } from "@/lib/context/drawer-context"
import { useEffect } from "react"

interface ActionBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  itemsPerPage: number
  onItemsPerPageChange: (value: number) => void
  addButtonText?: string
  searchPlaceholder?: string
  showExport?: boolean
  showAudit?: boolean
  showPrint?: boolean
  showFilters?: boolean
  status?: string
  onStatusChange?: (value: string) => void
  showStatusFilter?: boolean
  onExport?: () => void
  onPrint?: () => void
  isAddDrawerOpen?: boolean
  onAddDrawerOpenChange?: (open: boolean) => void
  addDrawerContent?: React.ReactNode
  addButtonLink?: string
  filters?: React.ReactNode
}

export function ActionBar({
  searchQuery,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  addButtonText = "Add New",
  searchPlaceholder = "Search...",
  showExport = true,
  showAudit = true,
  showPrint = true,
  showFilters = true,
  status,
  onStatusChange,
  showStatusFilter = true,
  onExport,
  onPrint,
  isAddDrawerOpen = false,
  onAddDrawerOpenChange,
  addDrawerContent,
  addButtonLink,
  filters,
}: ActionBarProps) {
  const { setIsAnyDrawerOpen } = useDrawer()

  // Update global drawer state when add drawer opens/closes
  useEffect(() => {
    setIsAnyDrawerOpen(isAddDrawerOpen)
  }, [isAddDrawerOpen, setIsAnyDrawerOpen])

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-1">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Buttons & Filters */}
        <div className="flex justify-between items-center">
          {/* Left side */}
          <div className="flex gap-2">
            {showExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {showPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">


          {showFilters && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}

            {filters}
            <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            {showStatusFilter && onStatusChange && (
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}


            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => addButtonLink ? window.location.href = addButtonLink : onAddDrawerOpenChange?.(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {addButtonText}
            </Button>
          </div>
        </div>
      </div>

      {addDrawerContent && (
        <Drawer open={isAddDrawerOpen} onOpenChange={onAddDrawerOpenChange}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-2xl">
              {addDrawerContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}

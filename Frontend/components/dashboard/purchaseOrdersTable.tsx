"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download, Calendar, Building2 } from 'lucide-react'
// API imports removed - using mock interface
interface IPurchaseOrderComplete {
  id?: number;
  po_number: string;
  vendor_id: number;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}
import { generatePurchaseOrderPDF } from '@/lib/utils/pdf-generator'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface PurchaseOrdersTableProps {
  limit?: number
  showViewAll?: boolean
}

export function PurchaseOrdersTable({ limit = 5, showViewAll = true }: PurchaseOrdersTableProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<IPurchaseOrderComplete[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const response = await getAllPurchaseOrders(
        { status: 'pending' }, // Only show pending orders
        { page: 1, limit, sortBy: 'created_at', sortOrder: 'desc' }
      )
      setPurchaseOrders(response.data)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async (purchaseOrder: IPurchaseOrderComplete) => {
    try {
      generatePurchaseOrderPDF(purchaseOrder)
      toast({
        title: "Success",
        description: "PDF downloaded successfully"
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'received':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Available Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Available Purchase Orders
          </CardTitle>
          {showViewAll && (
            <Link href="/purchase-orders">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {purchaseOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No pending purchase orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-emerald-600">{po.po_number}</h3>
                      <p className="text-sm text-gray-600">{po.vendor_name || 'Unknown Vendor'}</p>
                    </div>
                    <Badge className={getStatusColor(po.status)}>
                      {po.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(po)}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Link href={`/purchase-orders`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(po.created_at)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {po.total_amount 
                        ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(po.total_amount)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
                
                {po.items && po.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{po.items.length}</span> item{po.items.length !== 1 ? 's' : ''}
                      {po.items.some(item => item.rfid_tags && item.rfid_tags.length > 0) && (
                        <span className="ml-2 text-emerald-600">
                          • {po.items.reduce((total, item) => total + (item.rfid_tags?.length || 0), 0)} RFID tags
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

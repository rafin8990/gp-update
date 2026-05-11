"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { requisitionsApi, IRequisitionWithItems } from '@/lib/api/requisitions'
import { pickSlipsApi } from '@/lib/api/packs'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'


export default function RequisitionViewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IRequisitionWithItems | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  /** EPC count per item from all pick slips for this requisition (1 RFID ≈ 1 unit). */
  const [pickedEpcCounts, setPickedEpcCounts] = useState<Record<string, number>>({})
  const [pdfLoading, setPdfLoading] = useState(false)

  const loadPickedCountsFromPickSlips = async (requisitionId: number) => {
    try {
      const res = await pickSlipsApi.getAll({ requisition_id: requisitionId, page: 1, limit: 1000 })
      const counts: Record<string, number> = {}
      for (const slip of res.data || []) {
        for (const it of slip.items || []) {
          const k = String(it.item_number)
          counts[k] = (counts[k] || 0) + 1
        }
      }
      setPickedEpcCounts(counts)
    } catch (error) {
      console.error('Failed to load pick slips for requisition:', error)
      setPickedEpcCounts({})
    }
  }

  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await requisitionsApi.getById(Number(params.id))
        setData(res)
        await loadPickedCountsFromPickSlips(Number(params.id))
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const downloadPDF = async () => {
    if (!data) return
    
    setPdfLoading(true)
    try {
      // Create a hidden div with the content to capture
      const element = document.createElement('div')
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.top = '-9999px'
      element.style.width = '210mm' // A4 width
      element.style.backgroundColor = 'white'
      element.style.padding = '20px'
      element.style.fontFamily = 'Arial, sans-serif'
      
      // Generate HTML content
      const totalRequested = data.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalPicked = Object.values(pickedEpcCounts).reduce((sum, qty) => sum + qty, 0)
      const overallProgress = data.items.length > 0 ? 
        Math.round(
          data.items.reduce((sum, item) => {
            const picked = pickedEpcCounts[item.item_number] || 0
            return sum + (picked / item.quantity) * 100
          }, 0) / data.items.length
        ) : 0

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 24px; margin: 0;">Requisition Report</h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 5px;"><strong>Requisition Number:</strong> ${data.requisition_number || data.id}</div>
          <div style="margin-bottom: 5px;"><strong>Status:</strong> ${data.status.toUpperCase()}</div>
          <div style="margin-bottom: 5px;"><strong>Created:</strong> ${formatDate(data.created_at)}</div>
          <div style="margin-bottom: 5px;"><strong>Description:</strong> ${data.description || 'N/A'}</div>
          ${data.source_order ? `<div style="margin-bottom: 5px;"><strong>Source order:</strong> ${data.source_order}</div>` : ''}
        </div>

        <div style="display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #3b82f6; margin-bottom: 5px;">${totalRequested.toLocaleString()}</div>
            <div style="font-size: 10px; color: #6b7280;">Total Requested</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #10b981; margin-bottom: 5px;">${totalPicked.toLocaleString()}</div>
            <div style="font-size: 10px; color: #6b7280;">Total picked (RFID)</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #8b5cf6; margin-bottom: 5px;">${overallProgress}%</div>
            <div style="font-size: 10px; color: #6b7280;">Overall Progress</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Number</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Requested</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Picked (RFID)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">UOM</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Progress</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, index) => {
              const pickedQty = pickedEpcCounts[item.item_number] || 0
              const progress = item.quantity > 0 ? Math.round((pickedQty / item.quantity) * 100) : 0
              const status = pickedQty >= item.quantity ? 'Complete' : 'In Progress'
              const rowColor = index % 2 === 0 ? '#f9fafb' : 'white'
              
              return `
                <tr style="background-color: ${rowColor};">
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.item_number}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.item_description || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity.toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${pickedQty.toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.uom}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${progress}%</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${status}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; text-align: center;">
          <div style="border-top: 1px solid #000; width: 300px; margin: 0 auto 10px;"></div>
          <div style="font-size: 10px; font-weight: bold;">Authorized Signature</div>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 8px; color: #6b7280;">
          Generated on: ${new Date().toLocaleString()}
        </div>
      `
      
      document.body.appendChild(element)
      
      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Remove the temporary element
      document.body.removeChild(element)
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Download PDF
      pdf.save(`requisition-${data.id}-${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setPdfLoading(false)
    }
  }


  const handleCancel = async () => {
    if (!data?.id) return
    
    if (!confirm('Are you sure you want to cancel this requisition?')) return
    
    setActionLoading(true)
    try {
      await requisitionsApi.updateStatus(data.id, 'cancel')
      setData(prev => prev ? { ...prev, status: 'cancel' } : null)
    } catch (error) {
      alert('Failed to cancel requisition')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReceived = async () => {
    if (!data?.id) return
    
    setActionLoading(true)
    try {
      await requisitionsApi.updateStatus(data.id, 'received')
      setData(prev => prev ? { ...prev, status: 'received' } : null)
    } catch (error) {
      alert('Failed to update requisition status')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <PageLayout activePage="requisitions">
      <PageHeader
        title={`Requisition ${data?.requisition_number || ''}`}
        breadcrumbItems={[
          { label: 'Requisitions', href: '/requisitions' },
          { label: 'View', href: `/requisitions/${params?.id}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/requisitions')}>Back</Button>
            <Button 
              variant="outline" 
              onClick={downloadPDF}
              disabled={pdfLoading || !data}
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
            >
              {pdfLoading ? 'Generating...' : '📄 Download PDF'}
            </Button>
            {data?.id && data?.status !== 'received' && (
              <Button onClick={() => router.push(`/requisitions/${data.id}/edit`)}>Edit</Button>
            )}
            {data?.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  onClick={() => handleCancel()}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel'}
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReceived()}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Updating...' : 'Mark as Delivered'}
                </Button>
              </>
            )}
            {data?.status === 'received' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>✓ Received - Cannot be modified</span>
              </div>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="py-8 text-gray-500">Loading...</div>
      ) : !data ? (
        <div className="py-8 text-gray-500">Not found</div>
      ) : (
        <div className="space-y-6">
          {data.status === 'received' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Requisition Received</h3>
                  <p className="text-sm text-green-600">This requisition has been marked as received and cannot be modified.</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border rounded-lg p-4">
            <div>
              <div className="text-sm text-gray-500">Requisition Number</div>
              <div className="font-medium">{data.requisition_number}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div>
                <Badge 
                  className={
                    data.status === 'received' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : data.status === 'cancel'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : data.status === 'complete'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }
                >
                  {data.status === 'received' ? '✓ Received' : data.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Partner</div>
              <div className="font-medium">{data.distribution_partner_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Organization Code</div>
              <div className="font-medium">{data.organization_code}</div>
            </div>
            {data.source_order != null && data.source_order !== '' && (
              <div>
                <div className="text-sm text-gray-500">Source order</div>
                <div className="font-medium">{data.source_order}</div>
              </div>
            )}
            {(data.transport_type_1 || data.transport_type_2 || data.vehicle_1 || data.vehicle_2) && (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Transport</div>
                <div className="font-medium text-sm">
                  {[data.transport_type_1, data.transport_type_2].filter(Boolean).join(' · ') || '—'}
                  {(data.vehicle_1 || data.vehicle_2) && (
                    <span className="text-gray-600">
                      {' '}
                      · {[data.vehicle_1, data.vehicle_2].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500">Address</div>
              <div className="font-medium">{data.address}</div>
            </div>
            {data.description && (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Description</div>
                <div className="text-gray-700">{data.description}</div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          {data.items && data.items.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-medium mb-4">Progress Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Requested</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.values(pickedEpcCounts).reduce((sum, qty) => sum + qty, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total picked (RFID)</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {data.items.length > 0 ? 
                      Math.round(
                        data.items.reduce((sum, item) => {
                          const receivedQty = pickedEpcCounts[item.item_number] || 0
                          return sum + (receivedQty / item.quantity) * 100
                        }, 0) / data.items.length
                      ) : 0
                    }%
                  </div>
                  <div className="text-sm text-purple-600">Overall Progress</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-lg">
            <div className="p-4 font-medium">Items</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requested Qty</TableHead>
                  <TableHead>Picked (RFID)</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items && data.items.length > 0 ? (
                  data.items.map((it) => {
                    const receivedQty = pickedEpcCounts[it.item_number] || 0
                    const progress = it.quantity > 0 ? (receivedQty / it.quantity) * 100 : 0
                    const isComplete = receivedQty >= it.quantity
                    
                    return (
                      <TableRow key={`${it.item_number}-${it.uom}`}>
                        <TableCell className="font-medium">{it.item_number}</TableCell>
                        <TableCell>{it.item_description || 'N/A'}</TableCell>
                        <TableCell>{it.quantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                            {receivedQty.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{it.uom}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isComplete ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 w-12">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">No items</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageLayout>
  )
}



import jsPDF from 'jspdf'
// API imports removed - using mock interface
interface IPurchaseOrderComplete {
  id?: number;
  po_number: string;
  vendor_id: number;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export const generatePurchaseOrderPDF = (purchaseOrder: IPurchaseOrderComplete): void => {
  const doc = new jsPDF()
  
  // Set up colors
  const primaryColor = '#059669' // emerald-600
  const secondaryColor = '#6B7280' // gray-500
  const lightGray = '#F9FAFB' // gray-50
  
  // Company Header
  doc.setFillColor(primaryColor)
  doc.rect(0, 0, 210, 30, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('GrameenPhone', 20, 20)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Warehouse Management System', 20, 26)
  
  // Document Title
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PURCHASE ORDER', 20, 50)
  
  // PO Number and Date
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`PO Number: ${purchaseOrder.po_number}`, 20, 65)
  doc.text(`Date: ${formatDate(purchaseOrder.created_at)}`, 20, 72)
  doc.text(`Status: ${purchaseOrder.status.toUpperCase()}`, 20, 79)
  
  // Vendor Information
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('VENDOR INFORMATION', 20, 95)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${purchaseOrder.vendor_name || 'N/A'}`, 20, 105)
  doc.text(`Code: ${purchaseOrder.vendor_code || 'N/A'}`, 20, 112)
  
  // Items Table Header
  doc.setFillColor(lightGray)
  doc.rect(20, 125, 170, 10, 'F')
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Item Code', 25, 132)
  doc.text('Description', 60, 132)
  doc.text('Quantity', 130, 132)
  doc.text('Unit', 150, 132)
  doc.text('Unit Price', 170, 132)
  doc.text('Total', 185, 132)
  
  // Items Table Content
  let yPosition = 140
  let totalAmount = 0
  
  if (purchaseOrder.items && purchaseOrder.items.length > 0) {
    purchaseOrder.items.forEach((item, index) => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
        
        // Repeat header on new page
        doc.setFillColor(lightGray)
        doc.rect(20, yPosition, 170, 10, 'F')
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Item Code', 25, yPosition + 7)
        doc.text('Description', 60, yPosition + 7)
        doc.text('Quantity', 130, yPosition + 7)
        doc.text('Unit', 150, yPosition + 7)
        doc.text('Unit Price', 170, yPosition + 7)
        doc.text('Total', 185, yPosition + 7)
        yPosition = 35
      }
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(item.item_code || 'N/A', 25, yPosition)
      doc.text(item.item_description || 'N/A', 60, yPosition)
      doc.text(item.quantity.toString(), 130, yPosition)
      doc.text(item.unit || 'N/A', 150, yPosition)
      doc.text('$0.00', 170, yPosition) // Placeholder for unit price
      doc.text('$0.00', 185, yPosition) // Placeholder for total
      
      yPosition += 8
      
      // Display RFID tags for this item
      if (item.rfid_tags && item.rfid_tags.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100) // Gray color for RFID info
        
        // RFID header
        doc.text('RFID Tags:', 25, yPosition)
        yPosition += 6
        
        // Display each RFID tag
        item.rfid_tags.forEach((rfid, rfidIndex) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          
          const rfidInfo = `• ${rfid.tag_uid || 'N/A'} (Qty: ${rfid.quantity}, Status: ${rfid.rfid_status || 'N/A'})`
          doc.text(rfidInfo, 30, yPosition)
          yPosition += 5
        })
        
        yPosition += 3 // Extra space after RFID tags
        doc.setTextColor(0, 0, 0) // Reset to black
      }
    })
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('No items found', 25, yPosition)
    yPosition += 15
  }
  
  // Total Section
  const totalY = Math.max(yPosition + 20, 200)
  
  doc.setFillColor(lightGray)
  doc.rect(120, totalY, 70, 15, 'F')
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL AMOUNT:', 125, totalY + 10)
  
  const formattedTotal = purchaseOrder.total_amount 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(purchaseOrder.total_amount)
    : '$0.00'
  
  doc.text(formattedTotal, 170, totalY + 10)
  
  // Footer
  const footerY = 280
  doc.setDrawColor(secondaryColor)
  doc.line(20, footerY, 190, footerY)
  
  doc.setTextColor(secondaryColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a computer-generated document. No signature required.', 20, footerY + 10)
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, footerY + 17)
  
  // Terms and Conditions
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TERMS AND CONDITIONS:', 20, footerY + 30)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const terms = [
    '1. All items must be delivered within 30 days of order confirmation.',
    '2. Payment terms: Net 30 days from delivery.',
    '3. Quality standards must meet company specifications.',
    '4. Any damaged or incorrect items will be returned at vendor expense.'
  ]
  
  terms.forEach((term, index) => {
    doc.text(term, 20, footerY + 40 + (index * 6))
  })
  
  // Save the PDF
  doc.save(`Purchase_Order_${purchaseOrder.po_number}_${formatDate(purchaseOrder.created_at)}.pdf`)
}

const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return new Date().toLocaleDateString()
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

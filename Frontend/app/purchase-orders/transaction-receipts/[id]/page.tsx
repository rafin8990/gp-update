"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Edit, Package, ReceiptText } from 'lucide-react';
import {
  Document,
  Image as PdfImage,
  PDFDownloadLink,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { IPoLotDetail, IPoTransactionReceipt, poTransactionReceiptsApi } from '@/lib/api/po-transaction-receipts';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: '#111827' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', maxWidth: '70%' },
  logo: { width: 60, height: 30, objectFit: 'contain' },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#4b5563', marginTop: 2 },
  headerRight: { fontSize: 10, lineHeight: 1.5, textAlign: 'right' },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 20,
    marginBottom: 16,
  },
  field: { width: '47%' },
  fieldLabel: { fontSize: 9, color: '#6b7280' },
  fieldValue: { fontSize: 11, fontWeight: 600, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: '#d1d5db' },
  tableRow: { flexDirection: 'row' },
  tableHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    padding: 6,
    fontSize: 9,
  },
  signatureRow: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBlock: { width: 170 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#111827', marginBottom: 4 },
  signatureLabel: { fontSize: 10 },
});

const ReceiptVoucherPdfDocument = ({
  receipt,
  lots,
  logoSrc,
}: {
  receipt: IPoTransactionReceipt;
  lots: IPoLotDetail[];
  logoSrc: string;
}) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.headerRow}>
        <View style={pdfStyles.headerLeft}>
          {logoSrc ? <PdfImage src={logoSrc} style={pdfStyles.logo} /> : null}
          <View>
            <Text style={pdfStyles.title}>PO Receipt Voucher</Text>
            <Text style={pdfStyles.subtitle}>ev Warehouse Management</Text>
          </View>
        </View>
        <View style={pdfStyles.headerRight}>
          <Text>Receipt: {receipt.interface_line_number || '-'}</Text>
          <Text>Date: {formatDate(receipt.transaction_date)}</Text>
        </View>
      </View>

      <View style={pdfStyles.sectionGrid}>
        {[
          ['PO Header ID', receipt.po_header_id],
          ['Header Interface Number', receipt.header_interface_number],
          ['Transaction Type', receipt.transaction_type],
          ['Source Document Code', receipt.source_document_code],
          ['Receipt Source Code', receipt.receipt_source_code],
          ['Document Number', receipt.document_number],
          ['Document Line Number', receipt.document_line_number],
          ['Document Schedule Number', receipt.document_schedule_number],
          ['Business Unit', receipt.business_unit],
          ['Sub Inventory', receipt.sub_inventory],
          ['UOM', receipt.uom],
          ['Organization Code', receipt.organization_code],
        ].map(([label, value]) => (
          <View key={String(label)} style={pdfStyles.field}>
            <Text style={pdfStyles.fieldLabel}>{label}</Text>
            <Text style={pdfStyles.fieldValue}>{value ? String(value) : '-'}</Text>
          </View>
        ))}
      </View>

      <Text style={pdfStyles.sectionTitle}>Lot Details</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableRow}>
          {['SL', 'PO Header ID', 'Item Number', 'Lot Number', 'Transaction Quantity', 'Expired Date'].map(
            (header, index, arr) => (
              <Text
                key={header}
                style={[
                  pdfStyles.tableHeaderCell,
                  { width: ['8%', '20%', '16%', '14%', '20%', '22%'][index] },
                  index === arr.length - 1 ? { borderRightWidth: 0 } : null,
                ]}
              >
                {header}
              </Text>
            ),
          )}
        </View>
        {(lots.length ? lots : [null]).map((lot, index, arr) => (
          <View key={lot?.id ?? 'empty'} style={pdfStyles.tableRow}>
            {lot ? (
              [index + 1, lot.po_header_id, lot.item_number, lot.lot_number, lot.transaction_quantity, formatDate(lot.expired_date)].map(
                (cell, cellIndex, cellArr) => (
                  <Text
                    key={`${lot.id}-${cellIndex}`}
                    style={[
                      pdfStyles.tableCell,
                      { width: ['8%', '20%', '16%', '14%', '20%', '22%'][cellIndex] },
                      cellIndex === cellArr.length - 1 ? { borderRightWidth: 0 } : null,
                      index === arr.length - 1 ? { borderBottomWidth: 0 } : null,
                    ]}
                  >
                    {String(cell)}
                  </Text>
                ),
              )
            ) : (
              <Text style={[pdfStyles.tableCell, { width: '100%', borderRightWidth: 0, borderBottomWidth: 0, textAlign: 'center' }]}>
                No lot details found
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={pdfStyles.signatureRow}>
        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureLabel}>Prepared By</Text>
        </View>
        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureLabel}>Authorized Signature</Text>
        </View>
      </View>
    </Page>
  </Document>
);

const InfoField = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold break-words leading-7">{value ?? '-'}</p>
  </div>
);

export default function PoTransactionReceiptViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const voucherRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<IPoTransactionReceipt | null>(null);
  const [lots, setLots] = useState<IPoLotDetail[]>([]);
  const [logoSrc, setLogoSrc] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await poTransactionReceiptsApi.getById(Number(params.id));
        setReceipt(data.receipt);
        setLots(data.lots || []);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load receipt details',
          variant: 'destructive',
        });
        router.push('/purchase-orders/transaction-receipts');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) load();
  }, [params.id, router, toast]);

  useEffect(() => {
    let isMounted = true;

    const svgToPngDataUrl = async (svEVath: string): Promise<string> => {
      const svgText = await fetch(svEVath).then(res => res.text());
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(240, img.naturalWidth || 240);
        canvas.height = Math.max(60, img.naturalHeight || 60);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context unavailable');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    };

    const loadLogoAsDataUrl = async () => {
      try {
        const logoDataUrl = await svgToPngDataUrl('/logo/ev-logo.svg');
        if (isMounted) {
          setLogoSrc(logoDataUrl);
          return;
        }
      } catch {
        // fallback to png below
      }

      try {
        const response = await fetch('/placeholder-logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === 'string') {
            setLogoSrc(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch {
        // keep empty; PDF will render without logo if loading fails
      }
    };

    loadLogoAsDataUrl();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!receipt) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold">Receipt Not Found</h2>
          <Button onClick={() => router.push('/purchase-orders/transaction-receipts')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Receipts
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Receipt ${receipt.interface_line_number}`}
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Purchase Orders', href: '/purchase-orders' },
            { label: 'Transaction Receipts', href: '/purchase-orders/transaction-receipts' },
            { label: receipt.interface_line_number, href: `/purchase-orders/transaction-receipts/${receipt.id}` },
          ]}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/purchase-orders/transaction-receipts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Receipts
          </Button>
          <div className="flex gap-2">
            <PDFDownloadLink
              document={<ReceiptVoucherPdfDocument receipt={receipt} lots={lots} logoSrc={logoSrc} />}
              fileName={`po-receipt-${receipt.interface_line_number}.pdf`}
            >
              {({ loading: pdfGenerating }) => (
                <Button variant="outline" disabled={pdfGenerating}>
                  <Download className="h-4 w-4 mr-2" />
                  {pdfGenerating ? 'Generating...' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
            <Button onClick={() => router.push(`/purchase-orders/transaction-receipts/${receipt.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Receipt Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoField label="PO Header ID" value={receipt.po_header_id} />
            <InfoField label="Interface Line Number" value={receipt.interface_line_number} />
            <InfoField label="Header Interface Number" value={receipt.header_interface_number} />
            <InfoField label="Transaction Type" value={receipt.transaction_type} />
            <InfoField label="Transaction Date" value={formatDate(receipt.transaction_date)} />
            <InfoField label="Source Document Code" value={receipt.source_document_code} />
            <InfoField label="Receipt Source Code" value={receipt.receipt_source_code} />
            <InfoField label="Parent Transaction ID" value={receipt.parent_transaction_id} />
            <InfoField label="Organization Code" value={receipt.organization_code} />
            <InfoField label="Document Number" value={receipt.document_number} />
            <InfoField label="Document Line Number" value={receipt.document_line_number} />
            <InfoField label="Document Schedule Number" value={receipt.document_schedule_number} />
            <InfoField label="Business Unit" value={receipt.business_unit} />
            <InfoField label="Sub Inventory" value={receipt.sub_inventory} />
            <InfoField label="UOM" value={receipt.uom} />
            <InfoField label="Created At" value={formatDate(receipt.created_at)} />
            <InfoField label="Updated At" value={formatDate(receipt.updated_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lot Details ({lots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lot details found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>PO Header ID</TableHead>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead>Transaction Quantity</TableHead>
                      <TableHead>Expired Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map(lot => (
                      <TableRow key={lot.id}>
                        <TableCell>{lot.id}</TableCell>
                        <TableCell>{lot.po_header_id}</TableCell>
                        <TableCell>{lot.item_number}</TableCell>
                        <TableCell>{lot.lot_number}</TableCell>
                        <TableCell>{lot.transaction_quantity}</TableCell>
                        <TableCell>{formatDate(lot.expired_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voucher Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div
                ref={voucherRef}
                className="bg-white text-black border rounded-lg p-10 space-y-10 w-[1100px] max-w-none mx-auto"
              >
              <div className="flex items-start justify-between border-b-2 pb-6 gap-6">
                <div className="flex items-start gap-4">
                  <img src="/logo/ev-logo.svg" alt="ev logo" className="h-20 w-auto object-contain" />
                  <div>
                    <h2 className="text-4xl font-bold">PO Receipt Voucher</h2>
                    <p className="text-xl text-gray-600 mt-2">ev Warehouse Management</p>
                  </div>
                </div>
                <div className="text-right text-xl leading-9">
                  <p><span className="font-semibold">Receipt:</span> {receipt.interface_line_number}</p>
                  <p><span className="font-semibold">Date:</span> {formatDate(receipt.transaction_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                <InfoField label="PO Header ID" value={receipt.po_header_id} />
                <InfoField label="Header Interface Number" value={receipt.header_interface_number} />
                <InfoField label="Transaction Type" value={receipt.transaction_type} />
                <InfoField label="Source Document Code" value={receipt.source_document_code} />
                <InfoField label="Receipt Source Code" value={receipt.receipt_source_code} />
                <InfoField label="Document Number" value={receipt.document_number} />
                <InfoField label="Document Line Number" value={receipt.document_line_number} />
                <InfoField label="Document Schedule Number" value={receipt.document_schedule_number} />
                <InfoField label="Business Unit" value={receipt.business_unit} />
                <InfoField label="Sub Inventory" value={receipt.sub_inventory} />
                <InfoField label="UOM" value={receipt.uom} />
                <InfoField label="Organization Code" value={receipt.organization_code} />
              </div>

              <div>
                <h3 className="text-3xl font-semibold mb-5">Lot Details</h3>
                <table className="w-full border-collapse text-lg">
                  <thead>
                    <tr>
                      <th className="border p-4 text-left font-semibold bg-gray-50">SL</th>
                      <th className="border p-4 text-left font-semibold bg-gray-50">PO Header ID</th>
                      <th className="border p-4 text-left font-semibold bg-gray-50">Item Number</th>
                      <th className="border p-4 text-left font-semibold bg-gray-50">Lot Number</th>
                      <th className="border p-4 text-left font-semibold bg-gray-50">Transaction Quantity</th>
                      <th className="border p-4 text-left font-semibold bg-gray-50">Expired Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border p-5 text-center text-gray-500">
                          No lot details found
                        </td>
                      </tr>
                    ) : (
                      lots.map((lot, index) => (
                        <tr key={lot.id}>
                          <td className="border p-4">{index + 1}</td>
                          <td className="border p-4">{lot.po_header_id}</td>
                          <td className="border p-4">{lot.item_number}</td>
                          <td className="border p-4">{lot.lot_number}</td>
                          <td className="border p-4">{lot.transaction_quantity}</td>
                          <td className="border p-4">{formatDate(lot.expired_date)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-16 flex justify-between text-lg">
                <div>
                  <div className="border-t border-black w-48 mb-2" />
                  <p>Prepared By</p>
                </div>
                <div>
                  <div className="border-t border-black w-48 mb-2" />
                  <p>Authorized Signature</p>
                </div>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

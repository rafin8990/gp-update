"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, RefreshCw, ReceiptText, Eye } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { IPoTransactionReceipt, poTransactionReceiptsApi } from '@/lib/api/po-transaction-receipts';

export default function PoTransactionReceiptsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<IPoTransactionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selected, setSelected] = useState<IPoTransactionReceipt | null>(null);
  const [searchInterface, setSearchInterface] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await poTransactionReceiptsApi.getAll({
        interface_line_number: searchInterface || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      setItems(response.data || []);
      const total = response.meta?.total || 0;
      setTotalItems(total);
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load receipts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    try {
      setDeleteLoading(true);
      await poTransactionReceiptsApi.delete(selected.id);
      toast({ title: 'Success', description: 'Receipt deleted successfully' });
      setSelected(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete receipt', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title="PO Transaction Receipts"
          breadcrumbItems={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Purchase Orders', href: '/purchase-orders' },
            { label: 'Transaction Receipts', href: '/purchase-orders/transaction-receipts' },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-end gap-3 justify-between">
              <div className="w-full sm:max-w-sm">
                <Label htmlFor="searchInterface">Search by Interface Line Number</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="searchInterface"
                    value={searchInterface}
                    onChange={e => setSearchInterface(e.target.value)}
                    placeholder="e.g. ILN..."
                  />
                  <Button onClick={() => { setCurrentPage(1); fetchData(); }}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSearchInterface(''); setCurrentPage(1); fetchData(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => router.push('/purchase-orders/transaction-receipts/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Receipt
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipts ({totalItems})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex justify-center"><div className="h-8 w-8 rounded-full border-b-2 animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <ReceiptText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No receipt found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface Line Number</TableHead>
                      <TableHead>PO Header ID</TableHead>
                      <TableHead>Transaction Type</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.interface_line_number}</TableCell>
                        <TableCell>{item.po_header_id}</TableCell>
                        <TableCell>{item.transaction_type || '-'}</TableCell>
                        <TableCell>{item.uom || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/purchase-orders/transaction-receipts/${item.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/purchase-orders/transaction-receipts/${item.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => setSelected(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this receipt?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

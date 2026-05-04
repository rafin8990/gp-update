"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { itemsApi, IItem, ItemQueryParams } from '@/lib/api/items';
import { PageHeader } from '@/components/layout/page-header';

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<IItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const params: ItemQueryParams = {
        limit: itemsPerPage,
        offset: offset,
        item_status: statusFilter === 'all' ? undefined : statusFilter,
      };

      // If search term is provided, we can filter by inventory_organization or other fields
      if (searchTerm.trim()) {
        params.inventory_organization = searchTerm.trim();
      }

      const response = await itemsApi.getAll(params);
      setItems(response.data);
      if (response.meta) {
        setTotalItems(response.meta.total || 0);
        const calculatedPages = Math.ceil((response.meta.total || 0) / itemsPerPage);
        setTotalPages(calculatedPages || 1);
      }
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (item: number) => {
    try {
      setDeleteLoading(true);
      await itemsApi.delete(item);
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };


  const handleView = (item: IItem) => {
    router.push(`/items/${item.item}`);
  };


  const handleSearch = () => {
    setCurrentPage(1);
    fetchItems();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Items"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" }
          ]}
        />

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-sm">
                  <Label htmlFor="search">Search by Organization</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search"
                      placeholder="Search by organization..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="w-40">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => router.push('/items/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Items ({totalItems})</CardTitle>
            <CardDescription>
              Manage and track your inventory items
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items found. Create your first item to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Primary UOM</TableHead>
                      <TableHead>UOM Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.item}>
                        <TableCell className="font-mono text-sm font-medium">{item.item}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>{item.user_item_type || '-'}</TableCell>
                        <TableCell>{item.inventory_organization || '-'}</TableCell>
                        <TableCell>{item.primary_uom_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.primary_uom_code || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.item_status)}>
                            {item.item_status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.creation_date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/items/${item.item}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete item "{item.item}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(item.item)}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </PageLayout>
  );
}

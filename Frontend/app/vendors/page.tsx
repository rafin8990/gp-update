"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Building2, RefreshCw, Mail, Phone, Globe, CreditCard, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { vendorsApi, IVendor, VendorQueryParams } from '@/lib/api/vendors';
import { PageHeader } from '@/components/layout/page-header';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<IVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<IVendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<IVendor | null>(null);
  const [formData, setFormData] = useState({
    vendor_code: '',
    name: '',
    short_name: '',
    status: 'active' as 'active' | 'inactive' | 'obsolete',
    org_code: '',
    fusion_vendor_id: '',
    tax_id: '',
    email: '',
    phone: '',
    website: '',
    payment_terms: '',
    currency: '',
    credit_limit: null as number | null
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchVendors();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params: VendorQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive' | 'obsolete'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await vendorsApi.getAll(params);
      setVendors(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});
      
      // Validation
      if (!formData.vendor_code.trim()) {
        setFormErrors(prev => ({ ...prev, vendor_code: 'Vendor code is required' }));
        return;
      }
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Vendor name is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        credit_limit: formData.credit_limit || undefined
      };
      await vendorsApi.create(apiData);
      toast({
        title: "Success",
        description: "Vendor created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchVendors();
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create vendor",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingVendor?.id) return;

    try {
      setUpdateLoading(true);
      setFormErrors({});
      
      // Validation
      if (!formData.vendor_code.trim()) {
        setFormErrors(prev => ({ ...prev, vendor_code: 'Vendor code is required' }));
        return;
      }
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Vendor name is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        credit_limit: formData.credit_limit || undefined
      };
      await vendorsApi.update(editingVendor.id, apiData);
      toast({
        title: "Success",
        description: "Vendor updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchVendors();
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update vendor",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await vendorsApi.delete(id);
      toast({
        title: "Success",
        description: "Vendor deleted successfully"
      });
      fetchVendors();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete vendor",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = (vendor: IVendor) => {
    setViewingVendor(vendor);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (vendor: IVendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code,
      name: vendor.name,
      short_name: vendor.short_name || '',
      status: vendor.status as 'active' | 'inactive' | 'obsolete',
      org_code: vendor.org_code || '',
      fusion_vendor_id: vendor.fusion_vendor_id || '',
      tax_id: vendor.tax_id || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      payment_terms: vendor.payment_terms || '',
      currency: vendor.currency || '',
      credit_limit: vendor.credit_limit || null
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vendor_code: '',
      name: '',
      short_name: '',
      status: 'active',
      org_code: '',
      fusion_vendor_id: '',
      tax_id: '',
      email: '',
      phone: '',
      website: '',
      payment_terms: '',
      currency: '',
      credit_limit: null
    });
    setFormErrors({});
    setEditingVendor(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchVendors();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'obsolete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-blue-600 bg-blue-100';
      case 'obsolete':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <PageLayout activePage="vendors">
      <div className="space-y-6">
        <PageHeader
          title="Vendors"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Vendors", href: "/vendors" }
          ]}
        />

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-sm">
                  <Label htmlFor="search">Search</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search"
                      placeholder="Search by code, name, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} >
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
                      <SelectItem value="obsolete">Obsolete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button  onClick={handleReset} >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Vendor</DialogTitle>
                      <DialogDescription>
                        Add a new vendor to your system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendor_code">Vendor Code *</Label>
                        <Input
                          id="vendor_code"
                          value={formData.vendor_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                          placeholder="Enter vendor code"
                          className={formErrors.vendor_code ? "border-red-500" : ""}
                        />
                        {formErrors.vendor_code && <p className="text-sm text-red-500 mt-1">{formErrors.vendor_code}</p>}
                      </div>
                      <div>
                        <Label htmlFor="name">Vendor Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter vendor name"
                          className={formErrors.name ? "border-red-500" : ""}
                        />
                        {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                      </div>
                      <div>
                        <Label htmlFor="short_name">Short Name</Label>
                        <Input
                          id="short_name"
                          value={formData.short_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                          placeholder="Enter short name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="obsolete">Obsolete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="org_code">Organization Code</Label>
                        <Input
                          id="org_code"
                          value={formData.org_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, org_code: e.target.value }))}
                          placeholder="Enter organization code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fusion_vendor_id">Fusion Vendor ID</Label>
                        <Input
                          id="fusion_vendor_id"
                          value={formData.fusion_vendor_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, fusion_vendor_id: e.target.value }))}
                          placeholder="Enter fusion vendor ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tax_id">Tax ID</Label>
                        <Input
                          id="tax_id"
                          value={formData.tax_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                          placeholder="Enter tax ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="Enter website URL"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment_terms">Payment Terms</Label>
                        <Input
                          id="payment_terms"
                          value={formData.payment_terms}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                          placeholder="Enter payment terms"
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={formData.currency}
                          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                          placeholder="Enter currency"
                        />
                      </div>
                      <div>
                        <Label htmlFor="credit_limit">Credit Limit</Label>
                        <Input
                          id="credit_limit"
                          type="number"
                          value={formData.credit_limit || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter credit limit"
                          min="0"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button  onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreate}
                        disabled={createLoading}
                      >
                        {createLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          'Create Vendor'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Vendors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendors ({totalItems})</CardTitle>
            <CardDescription>
              Manage and track your vendors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No vendors found. Create your first vendor to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Short Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-mono text-sm">{vendor.vendor_code}</TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.short_name || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusColor(vendor.status)}
                          >
                            {vendor.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {vendor.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{vendor.email}</span>
                              </div>
                            )}
                            {vendor.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                <span>{vendor.phone}</span>
                              </div>
                            )}
                            {vendor.website && (
                              <div className="flex items-center gap-1 text-sm">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{vendor.website}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vendor.credit_limit ? (
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              <span>{formatCurrency(vendor.credit_limit)}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{formatDate(vendor.created_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleView(vendor)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(vendor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button   className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete vendor "{vendor.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => vendor.id && handleDelete(vendor.id)}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
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
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>
                Update vendor information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-vendor-code">Vendor Code *</Label>
                <Input
                  id="edit-vendor-code"
                  value={formData.vendor_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                  placeholder="Enter vendor code"
                  className={formErrors.vendor_code ? "border-red-500" : ""}
                />
                {formErrors.vendor_code && <p className="text-sm text-red-500 mt-1">{formErrors.vendor_code}</p>}
              </div>
              <div>
                <Label htmlFor="edit-name">Vendor Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter vendor name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="edit-short-name">Short Name</Label>
                <Input
                  id="edit-short-name"
                  value={formData.short_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                  placeholder="Enter short name"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="obsolete">Obsolete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-org-code">Organization Code</Label>
                <Input
                  id="edit-org-code"
                  value={formData.org_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, org_code: e.target.value }))}
                  placeholder="Enter organization code"
                />
              </div>
              <div>
                <Label htmlFor="edit-fusion-vendor-id">Fusion Vendor ID</Label>
                <Input
                  id="edit-fusion-vendor-id"
                  value={formData.fusion_vendor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, fusion_vendor_id: e.target.value }))}
                  placeholder="Enter fusion vendor ID"
                />
              </div>
              <div>
                <Label htmlFor="edit-tax-id">Tax ID</Label>
                <Input
                  id="edit-tax-id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="Enter tax ID"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="Enter website URL"
                />
              </div>
              <div>
                <Label htmlFor="edit-payment-terms">Payment Terms</Label>
                <Input
                  id="edit-payment-terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                  placeholder="Enter payment terms"
                />
              </div>
              <div>
                <Label htmlFor="edit-currency">Currency</Label>
                <Input
                  id="edit-currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="Enter currency"
                />
              </div>
              <div>
                <Label htmlFor="edit-credit-limit">Credit Limit</Label>
                <Input
                  id="edit-credit-limit"
                  type="number"
                  value={formData.credit_limit || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter credit limit"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button  onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Vendor'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Vendor Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Vendor Details</DialogTitle>
              <DialogDescription>
                Detailed information for vendor: {viewingVendor?.name}
              </DialogDescription>
            </DialogHeader>
            {viewingVendor && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Vendor Code</Label>
                      <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{viewingVendor.vendor_code}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Name</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.name}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Short Name</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.short_name || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Status</Label>
                      <Badge 
                        className={getStatusColor(viewingVendor.status)}
                      >
                        {viewingVendor.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Organization Code</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.org_code || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Email</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {viewingVendor.email || '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Phone</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {viewingVendor.phone || '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Website</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {viewingVendor.website || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Business Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tax ID</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.tax_id || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Payment Terms</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.payment_terms || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Currency</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.currency || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Credit Limit</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {formatCurrency(viewingVendor.credit_limit || null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fusion Integration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fusion Integration</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Fusion Vendor ID</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingVendor.fusion_vendor_id || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Timestamps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created At</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(viewingVendor.created_at!)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(viewingVendor.updated_at!)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button  onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

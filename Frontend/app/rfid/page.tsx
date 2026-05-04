"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Radio, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { rfidApi, IRfidTag, CreateRfidData, UpdateRfidData, RfidQueryParams } from '@/lib/api/rfid';
import { PageHeader } from '@/components/layout/page-header';

export default function RfidPage() {
  const [rfidTags, setRfidTags] = useState<IRfidTag[]>([]);
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
  const [editingRfidTag, setEditingRfidTag] = useState<IRfidTag | null>(null);
  const [viewingRfidTag, setViewingRfidTag] = useState<IRfidTag | null>(null);
  const [formData, setFormData] = useState({
    epc: '',
    status: 'Available' as 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged',
    location: '',
    reader_id: '',
    rssi: '',
    count: 1,
    device_id: '',
    session_id: '',
    parent_tag: null as number | null
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchRfidTags();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchRfidTags = async () => {
    try {
      setLoading(true);
      const params: RfidQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await rfidApi.getAll(params);
      setRfidTags(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching RFID tags:', error);
      toast({
        title: "Error",
        description: "Failed to fetch RFID tags",
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
      if (!formData.epc.trim()) {
        setFormErrors(prev => ({ ...prev, epc: 'EPC is required' }));
        return;
      }

      await rfidApi.create(formData);
      toast({
        title: "Success",
        description: "RFID tag created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error creating RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create RFID tag",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRfidTag?.id) return;

    try {
      setUpdateLoading(true);
      setFormErrors({});
      
      // Validation
      if (!formData.epc.trim()) {
        setFormErrors(prev => ({ ...prev, epc: 'EPC is required' }));
        return;
      }

      await rfidApi.update(editingRfidTag.id, formData);
      toast({
        title: "Success",
        description: "RFID tag updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error updating RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update RFID tag",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await rfidApi.delete(id);
      toast({
        title: "Success",
        description: "RFID tag deleted successfully"
      });
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error deleting RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete RFID tag",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = (rfidTag: IRfidTag) => {
    setViewingRfidTag(rfidTag);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (rfidTag: IRfidTag) => {
    setEditingRfidTag(rfidTag);
    setFormData({
      epc: rfidTag.epc,
      status: rfidTag.status,
      location: rfidTag.location || '',
      reader_id: rfidTag.reader_id || '',
      rssi: rfidTag.rssi || '',
      count: rfidTag.count || 1,
      device_id: rfidTag.device_id || '',
      session_id: rfidTag.session_id || '',
      parent_tag: rfidTag.parent_tag || null
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      epc: '',
      status: 'Available',
      location: '',
      reader_id: '',
      rssi: '',
      count: 1,
      device_id: '',
      session_id: '',
      parent_tag: null
    });
    setFormErrors({});
    setEditingRfidTag(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRfidTags();
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
      case 'Available':
        return 'default';
      case 'Reserved':
        return 'secondary';
      case 'Assigned':
        return 'outline';
      case 'Consumed':
        return 'destructive';
      case 'Lost':
        return 'destructive';
      case 'Damaged':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-green-600 bg-green-100';
      case 'Reserved':
        return 'text-blue-600 bg-blue-100';
      case 'Assigned':
        return 'text-purple-600 bg-purple-100';
      case 'Consumed':
        return 'text-red-600 bg-red-100';
      case 'Lost':
        return 'text-red-600 bg-red-100';
      case 'Damaged':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <PageLayout activePage="rfid">
      <div className="space-y-6">
        <PageHeader
          title="RFID Tags"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "RFID", href: "/rfid" }
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
                      placeholder="Search by EPC..."
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
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Consumed">Consumed</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
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
                      Add RFID Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New RFID Tag</DialogTitle>
                      <DialogDescription>
                        Add a new RFID tag to your inventory system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="epc">EPC *</Label>
                        <Input
                          id="epc"
                          value={formData.epc}
                          onChange={(e) => setFormData(prev => ({ ...prev, epc: e.target.value }))}
                          placeholder="Enter EPC"
                          className={formErrors.epc ? "border-red-500" : ""}
                        />
                        {formErrors.epc && <p className="text-sm text-red-500 mt-1">{formErrors.epc}</p>}
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged') => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Reserved">Reserved</SelectItem>
                            <SelectItem value="Assigned">Assigned</SelectItem>
                            <SelectItem value="Consumed">Consumed</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Enter location (optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reader_id">Reader ID</Label>
                        <Input
                          id="reader_id"
                          value={formData.reader_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, reader_id: e.target.value }))}
                          placeholder="Enter reader ID (optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rssi">RSSI</Label>
                        <Input
                          id="rssi"
                          value={formData.rssi}
                          onChange={(e) => setFormData(prev => ({ ...prev, rssi: e.target.value }))}
                          placeholder="Enter RSSI (optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="count">Count</Label>
                        <Input
                          id="count"
                          type="number"
                          value={formData.count}
                          onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                          placeholder="Enter count"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="device_id">Device ID</Label>
                        <Input
                          id="device_id"
                          value={formData.device_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
                          placeholder="Enter device ID (optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="session_id">Session ID</Label>
                        <Input
                          id="session_id"
                          value={formData.session_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, session_id: e.target.value }))}
                          placeholder="Enter session ID (optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_tag">Parent Tag</Label>
                        <Select 
                          value={formData.parent_tag?.toString() || 'none'} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, parent_tag: value === 'none' ? null : parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent tag (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No parent tag</SelectItem>
                            {rfidTags.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id?.toString() || '0'}>
                                {tag.epc} - {tag.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          'Create RFID Tag'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* RFID Tags Table */}
        <Card>
          <CardHeader>
            <CardTitle>RFID Tags ({totalItems})</CardTitle>
            <CardDescription>
              Manage and track your RFID tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : rfidTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No RFID tags found. Create your first RFID tag to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>EPC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Reader ID</TableHead>
                      <TableHead>RSSI</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Parent Tag</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfidTags.map((rfidTag) => (
                      <TableRow key={rfidTag.id}>
                        <TableCell className="font-mono text-sm">{rfidTag.epc}</TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusColor(rfidTag.status)}
                          >
                            {rfidTag.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rfidTag.location ? (
                            <span className="text-sm">{rfidTag.location}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rfidTag.reader_id ? (
                            <span className="text-sm font-mono">{rfidTag.reader_id}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rfidTag.rssi ? (
                            <span className="text-sm">{rfidTag.rssi}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{rfidTag.count || 1}</span>
                        </TableCell>
                        <TableCell>
                          {rfidTag.device_id ? (
                            <span className="text-sm font-mono">{rfidTag.device_id}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rfidTag.parent_tag ? (
                            <span className="text-sm font-mono">
                              {rfidTags.find(tag => tag.id === rfidTag.parent_tag)?.epc || 
                               `#${rfidTag.parent_tag}`}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(rfidTag.created_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleView(rfidTag)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(rfidTag)}
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
                                  <AlertDialogTitle>Delete RFID Tag</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete RFID tag "{rfidTag.epc}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rfidTag.id && handleDelete(rfidTag.id)}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit RFID Tag</DialogTitle>
              <DialogDescription>
                Update RFID tag information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-epc">EPC *</Label>
                <Input
                  id="edit-epc"
                  value={formData.epc}
                  onChange={(e) => setFormData(prev => ({ ...prev, epc: e.target.value }))}
                  placeholder="Enter EPC"
                  className={formErrors.epc ? "border-red-500" : ""}
                />
                {formErrors.epc && <p className="text-sm text-red-500 mt-1">{formErrors.epc}</p>}
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Reserved">Reserved</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Consumed">Consumed</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-reader_id">Reader ID</Label>
                <Input
                  id="edit-reader_id"
                  value={formData.reader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, reader_id: e.target.value }))}
                  placeholder="Enter reader ID (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-rssi">RSSI</Label>
                <Input
                  id="edit-rssi"
                  value={formData.rssi}
                  onChange={(e) => setFormData(prev => ({ ...prev, rssi: e.target.value }))}
                  placeholder="Enter RSSI (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-count">Count</Label>
                <Input
                  id="edit-count"
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                  placeholder="Enter count"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="edit-device_id">Device ID</Label>
                <Input
                  id="edit-device_id"
                  value={formData.device_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
                  placeholder="Enter device ID (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-session_id">Session ID</Label>
                <Input
                  id="edit-session_id"
                  value={formData.session_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_id: e.target.value }))}
                  placeholder="Enter session ID (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-parent_tag">Parent Tag</Label>
                <Select 
                  value={formData.parent_tag?.toString() || 'none'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parent_tag: value === 'none' ? null : parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent tag (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent tag</SelectItem>
                    {rfidTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id?.toString() || '0'}>
                        {tag.epc} - {tag.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  'Update RFID Tag'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View RFID Tag</DialogTitle>
              <DialogDescription>
                RFID tag details
              </DialogDescription>
            </DialogHeader>
            {viewingRfidTag && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">EPC</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingRfidTag.epc}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge 
                    className={getStatusColor(viewingRfidTag.status)}
                  >
                    {viewingRfidTag.status}
                  </Badge>
                </div>
                {viewingRfidTag.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Location</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">{viewingRfidTag.location}</p>
                  </div>
                )}
                {viewingRfidTag.reader_id && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Reader ID</Label>
                    <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingRfidTag.reader_id}</p>
                  </div>
                )}
                {viewingRfidTag.rssi && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">RSSI</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">{viewingRfidTag.rssi}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Count</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">{viewingRfidTag.count || 1}</p>
                </div>
                {viewingRfidTag.device_id && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Device ID</Label>
                    <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingRfidTag.device_id}</p>
                  </div>
                )}
                {viewingRfidTag.session_id && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Session ID</Label>
                    <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingRfidTag.session_id}</p>
                  </div>
                )}
                {viewingRfidTag.parent_tag && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Parent Tag</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {rfidTags.find(tag => tag.id === viewingRfidTag.parent_tag)?.epc || 
                       `Tag ID: ${viewingRfidTag.parent_tag}`}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingRfidTag.created_at!)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingRfidTag.updated_at!)}
                  </p>
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

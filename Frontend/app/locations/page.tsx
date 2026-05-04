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
import { Plus, Search, Edit, Trash2, MapPin, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationsApi, ILocation, ILocationFilters, ICreateLocation, IUpdateLocation } from '@/lib/api/locations';
import { PageHeader } from '@/components/layout/page-header';

export default function LocationsPage() {
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(null);
  const [viewingLocation, setViewingLocation] = useState<ILocation | null>(null);
  const [formData, setFormData] = useState<ICreateLocation>({
    location_name: '',
    location_code: '',
    sub_inventory_code: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Check if form is valid for create
  const isCreateFormValid = formData.location_name.trim() && formData.location_code.trim();

  useEffect(() => {
    console.log('useEffect triggered with searchTerm:', searchTerm);
    fetchLocations();
  }, [searchTerm]);

  const fetchLocations = async () => {
    try {
      console.log('fetchLocations called');
      setLoading(true);
      const params: ILocationFilters = {
        searchTerm: searchTerm || undefined,
      };

      console.log('Calling API with params:', params);
      const response = await locationsApi.getLocations(params);
      console.log('API response:', response);
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Early validation - if form is not valid, don't proceed
    if (!isCreateFormValid) {
      setFormErrors({
        location_name: !formData.location_name.trim() ? 'Location name is required' : '',
        location_code: !formData.location_code.trim() ? 'Location code is required' : ''
      });
      return;
    }

    try {
      setCreateLoading(true);
      setFormErrors({});
      
      console.log('Creating location with data:', formData);
      console.log('Validation passed, calling API...');
      
      const result = await locationsApi.createLocation(formData);
      console.log('API response:', result);
      
      toast({
        title: "Success",
        description: "Location created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      console.error('Error creating location:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create location",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLocation?.id) return;

    try {
      setUpdateLoading(true);
      setFormErrors({});
      
      // Validation
      if (!formData.location_name.trim()) {
        setFormErrors(prev => ({ ...prev, location_name: 'Location name is required' }));
        return;
      }
      if (!formData.location_code.trim()) {
        setFormErrors(prev => ({ ...prev, location_code: 'Location code is required' }));
        return;
      }

      await locationsApi.updateLocation(editingLocation.id, formData);
      toast({
        title: "Success",
        description: "Location updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update location",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await locationsApi.deleteLocation(id);
      toast({
        title: "Success",
        description: "Location deleted successfully"
      });
      fetchLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete location",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = (location: ILocation) => {
    setViewingLocation(location);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (location: ILocation) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name,
      location_code: location.location_code,
      sub_inventory_code: location.sub_inventory_code || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      location_name: '',
      location_code: '',
      sub_inventory_code: '',
    });
    setFormErrors({});
    setEditingLocation(null);
    setCreateLoading(false);
    setUpdateLoading(false);
  };

  const handleSearch = () => {
    fetchLocations();
  };

  const handleReset = () => {
    setSearchTerm('');
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

  return (
    <PageLayout activePage="locations">
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Locations", href: "/locations" }
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
                      placeholder="Search by code, name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button  onClick={handleReset} >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (open) {
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Location</DialogTitle>
                      <DialogDescription>
                        Add a new location to organize your inventory
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="location_name">Location Name *</Label>
                          <Input
                            id="location_name"
                            value={formData.location_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                            placeholder="Enter location name"
                            className={formErrors.location_name ? "border-red-500" : ""}
                            required
                          />
                          {formErrors.location_name && <p className="text-sm text-red-500 mt-1">{formErrors.location_name}</p>}
                        </div>
                        <div>
                          <Label htmlFor="location_code">Location Code *</Label>
                          <Input
                            id="location_code"
                            value={formData.location_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, location_code: e.target.value }))}
                            placeholder="Enter location code"
                            className={formErrors.location_code ? "border-red-500" : ""}
                            required
                          />
                          {formErrors.location_code && <p className="text-sm text-red-500 mt-1">{formErrors.location_code}</p>}
                        </div>
                        <div>
                          <Label htmlFor="sub_inventory_code">Sub Inventory Code</Label>
                          <Input
                            id="sub_inventory_code"
                            value={formData.sub_inventory_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, sub_inventory_code: e.target.value }))}
                            placeholder="Enter sub inventory code"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createLoading || !isCreateFormValid}
                        >
                          {createLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating...
                            </>
                          ) : (
                            'Create Location'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Locations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Locations ({locations.length})</CardTitle>
            <CardDescription>
              Manage and organize your inventory locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No locations found. Create your first location to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Location Code</TableHead>
                      <TableHead>Sub Inventory Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.location_name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          <Badge variant="outline">{location.location_code}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {location.sub_inventory_code || '-'}
                        </TableCell>
                        <TableCell>{formatDate(location.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleView(location)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(location)}
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
                                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{location.location_name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => location.id && handleDelete(location.id)}
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

          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update location information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-location-name">Location Name *</Label>
                  <Input
                    id="edit-location-name"
                    value={formData.location_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                    placeholder="Enter location name"
                    className={formErrors.location_name ? "border-red-500" : ""}
                    required
                  />
                  {formErrors.location_name && <p className="text-sm text-red-500 mt-1">{formErrors.location_name}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-location-code">Location Code *</Label>
                  <Input
                    id="edit-location-code"
                    value={formData.location_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_code: e.target.value }))}
                    placeholder="Enter location code"
                    className={formErrors.location_code ? "border-red-500" : ""}
                    required
                  />
                  {formErrors.location_code && <p className="text-sm text-red-500 mt-1">{formErrors.location_code}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-sub-inventory-code">Sub Inventory Code</Label>
                  <Input
                    id="edit-sub-inventory-code"
                    value={formData.sub_inventory_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, sub_inventory_code: e.target.value }))}
                    placeholder="Enter sub inventory code"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Location'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View Location</DialogTitle>
              <DialogDescription>
                Location details
              </DialogDescription>
            </DialogHeader>
            {viewingLocation && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Location Name</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">{viewingLocation.location_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Location Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingLocation.location_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sub Inventory Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                    {viewingLocation.sub_inventory_code || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingLocation.created_at)}
                  </p>
                </div>
                {viewingLocation.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {formatDate(viewingLocation.updated_at)}
                    </p>
                  </div>
                )}
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

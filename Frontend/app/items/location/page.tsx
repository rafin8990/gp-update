"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, RefreshCw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { locationsApi, ILocation, LocationQueryParams } from "@/lib/api/locations";

export default function ItemsLocationPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLocations, setTotalLocations] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState<boolean>(false);
  const [viewingLocation, setViewingLocation] = useState<ILocation | null>(null);
  const { toast } = useToast();

  const locationsPerPage = 10;

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * locationsPerPage;
      const params: LocationQueryParams = {
        limit: locationsPerPage,
        offset: offset,
        name: searchTerm.trim() || undefined,
      };

      const response = await locationsApi.getAll(params);
      setLocations(response.data);
      if (response.meta) {
        setTotalLocations(response.meta.total || 0);
        const calculatedPages = Math.ceil((response.meta.total || 0) / locationsPerPage);
        setTotalPages(calculatedPages || 1);
      }
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch locations",
        variant: "destructive"
      });
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await locationsApi.delete(id);
      toast({
        title: "Success",
        description: "Location deleted successfully"
      });
      fetchLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLocations();
  };

  const handleReset = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" },
            { label: "Locations", href: "/items/location" },
          ]}
        />

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-sm">
                  <Label htmlFor="search">Search by Name</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => router.push('/items/location/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Locations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Locations ({totalLocations})</CardTitle>
            <CardDescription>
              Manage and track your warehouse locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
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
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-mono text-sm font-medium">{location.id}</TableCell>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>
                          {location.location_code ? (
                            <Badge variant="outline">{location.location_code}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{formatDate(location.created_at)}</TableCell>
                        <TableCell>{formatDate(location.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(location)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/items/location/${location.id}/edit`)}
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
                                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete location "{location.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(location.id)}
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
                  Showing {((currentPage - 1) * locationsPerPage) + 1} to {Math.min(currentPage * locationsPerPage, totalLocations)} of {totalLocations} results
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

        {/* View Location Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Location Details</DialogTitle>
              <DialogDescription>
                Detailed information for location: {viewingLocation?.name}
              </DialogDescription>
            </DialogHeader>
            {viewingLocation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID</Label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded mt-1">{viewingLocation.id}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Location Code</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                    {viewingLocation.location_code || '-'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Name</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingLocation.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created At</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{formatDate(viewingLocation.created_at)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{formatDate(viewingLocation.updated_at)}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationsApi, ILocation } from '@/lib/api/locations';

export default function EditLocationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location_code: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLoading(true);
        const locationId = Number(params.id);
        if (isNaN(locationId)) {
          toast({
            title: "Error",
            description: "Invalid location ID",
            variant: "destructive"
          });
          router.push('/items/location');
          return;
        }

        const location = await locationsApi.getById(locationId);
        setFormData({
          name: location.name || '',
          location_code: location.location_code || '',
        });
      } catch (error: any) {
        console.error('Error fetching location:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch location",
          variant: "destructive"
        });
        router.push('/items/location');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleUpdate = async () => {
    try {
      setUpdateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Location name is required' }));
        return;
      }

      const locationId = Number(params.id);
      if (isNaN(locationId)) {
        toast({
          title: "Error",
          description: "Invalid location ID",
          variant: "destructive"
        });
        return;
      }

      const updatePayload = {
        name: formData.name.trim(),
        location_code: formData.location_code.trim() || null,
      };

      await locationsApi.update(locationId, updatePayload);
      toast({
        title: "Success",
        description: "Location updated successfully"
      });
      router.push('/items/location');
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout activePage="items">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Edit Location"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" },
            { label: "Locations", href: "/items/location" },
            { label: "Edit Location", href: `/items/location/${params.id}/edit` }
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Location Information</CardTitle>
              <Button variant="outline" onClick={() => router.push('/items/location')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Locations
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter location name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="location_code">Location Code</Label>
                <Input
                  id="location_code"
                  value={formData.location_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_code: e.target.value }))}
                  placeholder="Enter location code (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">Optional: A unique code to identify this location</p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={() => router.push('/items/location')}>
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
                  'Update Location'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

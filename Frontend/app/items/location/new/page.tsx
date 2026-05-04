"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationsApi } from '@/lib/api/locations';

export default function NewLocationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location_code: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Location name is required' }));
        return;
      }

      const createPayload = {
        name: formData.name.trim(),
        location_code: formData.location_code.trim() || null,
      };

      await locationsApi.create(createPayload);
      toast({
        title: "Success",
        description: "Location created successfully"
      });
      router.push('/items/location');
    } catch (error: any) {
      console.error('Error creating location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Create New Location"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" },
            { label: "Locations", href: "/items/location" },
            { label: "New Location", href: "/items/location/new" }
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
                onClick={handleCreate}
                disabled={createLoading}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

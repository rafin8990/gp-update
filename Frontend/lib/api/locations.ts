import axiosInstance from '../axios';

// Location interface matching backend schema
export interface ILocation {
  id: number;
  name: string;
  location_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LocationQueryParams {
  name?: string;
  location_code?: string;
  limit?: number;
  offset?: number;
}

export interface CreateLocationData {
  name: string;
  location_code?: string | null;
}

export interface UpdateLocationData {
  name?: string;
  location_code?: string | null;
}

export interface LocationResponse {
  success: boolean;
  message: string;
  data: ILocation;
}

export interface LocationsListResponse {
  success: boolean;
  message: string;
  data: ILocation[];
  meta?: {
    total: number;
    limit?: number;
    offset?: number;
  };
}

export const locationsApi = {
  // Get all locations with pagination and filtering
  getAll: async (params: LocationQueryParams = {}): Promise<LocationsListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.name) {
        queryParams.append('name', params.name);
      }
      if (params.location_code) {
        queryParams.append('location_code', params.location_code);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/locations${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosInstance.get<LocationsListResponse>(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch locations');
    }
  },

  // Get single location by ID
  getById: async (id: number): Promise<ILocation> => {
    try {
      const response = await axiosInstance.get<LocationResponse>(`/locations/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching location:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch location');
    }
  },

  // Create new location
  create: async (data: CreateLocationData): Promise<ILocation> => {
    try {
      const response = await axiosInstance.post<LocationResponse>('/locations', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating location:', error);
      throw new Error(error.response?.data?.message || 'Failed to create location');
    }
  },

  // Update location
  update: async (id: number, data: UpdateLocationData): Promise<ILocation> => {
    try {
      const response = await axiosInstance.put<LocationResponse>(`/locations/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating location:', error);
      throw new Error(error.response?.data?.message || 'Failed to update location');
    }
  },

  // Delete location
  delete: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/locations/${id}`);
    } catch (error: any) {
      console.error('Error deleting location:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete location');
    }
  },
};

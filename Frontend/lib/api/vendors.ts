// Using fetch instead of axios for simplicity
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export interface IVendor {
  id?: number;
  vendor_code: string;
  name: string;
  short_name?: string;
  status: 'active' | 'inactive' | 'obsolete' | string;
  org_code?: string;
  fusion_vendor_id?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  currency?: string;
  credit_limit?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface VendorQueryParams {
  searchTerm?: string;
  vendor_code?: string;
  name?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  org_code?: string;
  fusion_vendor_id?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  currency?: string;
  credit_limit_min?: number;
  credit_limit_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVendorData {
  vendor_code: string;
  name: string;
  short_name?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  org_code?: string;
  fusion_vendor_id?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  currency?: string;
  credit_limit?: number;
}

export interface UpdateVendorData {
  vendor_code?: string;
  name?: string;
  short_name?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  org_code?: string;
  fusion_vendor_id?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  currency?: string;
  credit_limit?: number;
}

export interface VendorResponse {
  data: IVendor[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const vendorsApi = {
  // Get all vendors with pagination and filtering
  getAll: async (params: VendorQueryParams = {}): Promise<VendorResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/vendors${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  },

  // Get single vendor by ID
  getById: async (id: number): Promise<IVendor> => {
    try {
      const response = await apiRequest(`/api/v1/vendors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor:', error);
      throw error;
    }
  },

  // Create new vendor
  create: async (data: CreateVendorData): Promise<IVendor> => {
    try {
      const response = await apiRequest('/api/v1/vendors', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  },

  // Update vendor
  update: async (id: number, data: UpdateVendorData): Promise<IVendor> => {
    try {
      const response = await apiRequest(`/api/v1/vendors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  },

  // Delete vendor
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/vendors/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  },

  // Get vendors by status
  getByStatus: async (status: string): Promise<IVendor[]> => {
    try {
      const response = await apiRequest(`/api/v1/vendors/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendors by status:', error);
      throw error;
    }
  },

  // Search vendors by name or code
  search: async (query: string): Promise<IVendor[]> => {
    try {
      const response = await apiRequest(`/api/v1/vendors/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw error;
    }
  }
};

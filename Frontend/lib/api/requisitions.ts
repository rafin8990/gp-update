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

export interface IRequisition {
  id?: number;
  requisition_number: string;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description?: string | null;
  status: 'pending' | 'complete' | 'cancel' | 'received';
  created_at?: Date;
  updated_at?: Date;
}

export interface IRequisitionItem {
  id?: number;
  item_number: string;
  item_description?: string;
  quantity: number;
  uom: string;
  requisition_id?: number;
}

export interface IRequisitionWithItems extends IRequisition {
  items: IRequisitionItem[];
}

export interface RequisitionQueryParams {
  searchTerm?: string;
  requisition_number?: string;
  distribution_partner_name?: string;
  organization_code?: string;
  status?: 'pending' | 'complete' | 'cancel' | 'received';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateRequisitionData {
  requisition_number: string;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description?: string | null;
  status?: 'pending' | 'complete' | 'cancel' | 'received';
  items: Omit<IRequisitionItem, 'id' | 'requisition_id'>[];
}

export interface UpdateRequisitionData {
  requisition_number?: string;
  distribution_partner_name?: string;
  address?: string;
  organization_code?: string;
  description?: string | null;
  status?: 'pending' | 'complete' | 'cancel' | 'received';
  items?: Omit<IRequisitionItem, 'id' | 'requisition_id'>[];
}

export interface RequisitionResponse {
  success?: boolean;
  message?: string;
  data: IRequisitionWithItems[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export const requisitionsApi = {
  // Get all requisitions with pagination and filtering
  getAll: async (params: RequisitionQueryParams = {}): Promise<RequisitionResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/requisitions${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      throw error;
    }
  },

  // Get single requisition by ID
  getById: async (id: number): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching requisition:', error);
      throw error;
    }
  },

  // Create new requisition
  create: async (data: CreateRequisitionData): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest('/api/v1/requisitions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating requisition:', error);
      throw error;
    }
  },

  // Update requisition
  update: async (id: number, data: UpdateRequisitionData): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating requisition:', error);
      throw error;
    }
  },

  // Delete requisition
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/requisitions/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting requisition:', error);
      throw error;
    }
  },

  // Get requisitions by status
  getByStatus: async (status: string): Promise<IRequisitionWithItems[]> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching requisitions by status:', error);
      throw error;
    }
  },

  // Approve requisition
  approve: async (id: number): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}/approve`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error approving requisition:', error);
      throw error;
    }
  },

  // Reject requisition
  reject: async (id: number, reason?: string): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting requisition:', error);
      throw error;
    }
  },

  // Close requisition
  close: async (id: number): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}/close`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error closing requisition:', error);
      throw error;
    }
  },

  // Update requisition status
  updateStatus: async (id: number, status: 'pending' | 'complete' | 'cancel' | 'received'): Promise<IRequisitionWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/requisitions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating requisition status:', error);
      throw error;
    }
  }
};

// Legacy function names for backward compatibility
export const getAllRequisitions = requisitionsApi.getAll;
export const getRequisitionById = requisitionsApi.getById;
export const createRequisition = requisitionsApi.create;
export const updateRequisition = requisitionsApi.update;
export const deleteRequisition = requisitionsApi.delete;

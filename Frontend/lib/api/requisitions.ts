// Using fetch instead of axios for simplicity
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const authHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const t = localStorage.getItem('authToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg =
      (typeof body?.message === 'string' && body.message) ||
      (Array.isArray(body?.errorMessages) && body.errorMessages.join('; ')) ||
      `HTTP error! status: ${response.status}`;
    throw new Error(msg);
  }

  return body;
};

export interface IRequisition {
  id?: number;
  requisition_number: string;
  source_order?: string | null;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description?: string | null;
  status: 'pending' | 'complete' | 'cancel' | 'received';
  transport_type_1?: string | null;
  transport_type_2?: string | null;
  vehicle_1?: string | null;
  vehicle_2?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface IRequisitionItem {
  id?: number;
  item_number: string;
  item_description?: string;
  item_type?: string | null;
  quantity: number;
  uom: string;
  source_subinventory?: string | null;
  source_location_code?: string | null;
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
  source_order?: string;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description?: string | null;
  status?: 'pending' | 'complete' | 'cancel' | 'received';
  transport_type_1?: string;
  transport_type_2?: string;
  vehicle_1?: string;
  vehicle_2?: string;
  items: Omit<IRequisitionItem, 'id' | 'requisition_id' | 'item_description'>[];
}

export interface UpdateRequisitionData {
  requisition_number?: string;
  source_order?: string | null;
  distribution_partner_name?: string;
  address?: string;
  organization_code?: string;
  description?: string | null;
  status?: 'pending' | 'complete' | 'cancel' | 'received';
  transport_type_1?: string | null;
  transport_type_2?: string | null;
  vehicle_1?: string | null;
  vehicle_2?: string | null;
  items?: Omit<IRequisitionItem, 'id' | 'requisition_id' | 'item_description'>[];
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

  // Get requisitions by status (uses list API; no dedicated /status route on backend)
  getByStatus: async (status: string): Promise<IRequisitionWithItems[]> => {
    try {
      const response = await requisitionsApi.getAll({
        status: status as NonNullable<RequisitionQueryParams['status']>,
        page: 1,
        limit: 100,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching requisitions by status:', error);
      throw error;
    }
  },

  // Approve → set status to complete (PATCH /requisitions/:id)
  approve: async (id: number): Promise<IRequisitionWithItems> => {
    return requisitionsApi.update(id, { status: 'complete' });
  },

  // Reject → cancel
  reject: async (id: number): Promise<IRequisitionWithItems> => {
    return requisitionsApi.update(id, { status: 'cancel' });
  },

  // Close → complete
  close: async (id: number): Promise<IRequisitionWithItems> => {
    return requisitionsApi.update(id, { status: 'complete' });
  },

  // Update requisition status (same as PATCH body on /requisitions/:id)
  updateStatus: async (id: number, status: 'pending' | 'complete' | 'cancel' | 'received'): Promise<IRequisitionWithItems> => {
    return requisitionsApi.update(id, { status });
  }
};

// Legacy function names for backward compatibility
export const getAllRequisitions = requisitionsApi.getAll;
export const getRequisitionById = requisitionsApi.getById;
export const createRequisition = requisitionsApi.create;
export const updateRequisition = requisitionsApi.update;
export const deleteRequisition = requisitionsApi.delete;

// API for PO Hex Codes
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
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export interface IPoHexCode {
  id?: number;
  po_number: string;
  lot_no: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  uom: string;
  hex_code?: string; // Auto-generated, 16 characters
  serial_start?: string;
  serial_end?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PoHexCodeQueryParams {
  searchTerm?: string;
  po_number?: string;
  lot_no?: string;
  item_number?: string;
  hex_code?: string;
  serial_start?: string;
  serial_end?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePoHexCodeData {
  po_number: string;
  lot_no: string;
  item_number: string;
  quantity: number;
  uom: string;
  serial_start?: string;
  serial_end?: string;
}

export interface UpdatePoHexCodeData {
  po_number?: string;
  lot_no?: string;
  item_number?: string;
  quantity?: number;
  uom?: string;
  serial_start?: string | null;
  serial_end?: string | null;
  // Note: hex_code cannot be updated
}

export interface PoHexCodeResponse {
  data: IPoHexCode[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const poHexCodesApi = {
  // Get all PO hex codes with pagination and filtering
  getAll: async (params: PoHexCodeQueryParams = {}): Promise<PoHexCodeResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/po-hex-codes${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching PO hex codes:', error);
      throw error;
    }
  },

  // Get single PO hex code by ID
  getById: async (id: number): Promise<IPoHexCode> => {
    try {
      const response = await apiRequest(`/api/v1/po-hex-codes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching PO hex code:', error);
      throw error;
    }
  },

  // Create new PO hex code
  create: async (data: CreatePoHexCodeData): Promise<IPoHexCode> => {
    try {
      const response = await apiRequest('/api/v1/po-hex-codes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating PO hex code:', error);
      throw error;
    }
  },

  // Update PO hex code (hex_code will not change)
  update: async (id: number, data: UpdatePoHexCodeData): Promise<IPoHexCode> => {
    try {
      const response = await apiRequest(`/api/v1/po-hex-codes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating PO hex code:', error);
      throw error;
    }
  },

  // Delete PO hex code
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/po-hex-codes/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting PO hex code:', error);
      throw error;
    }
  },
};


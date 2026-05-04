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

export interface IRfidTag {
  id?: number;
  epc: string;
  timestamp?: Date;
  location?: string | null;
  reader_id?: string | null;
  status: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  rssi?: string | null;
  count?: number | null;
  device_id?: string | null;
  session_id?: string | null;
  parent_tag?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface RfidQueryParams {
  searchTerm?: string;
  epc?: string;
  status?: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RfidResponse {
  data: IRfidTag[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateRfidData {
  epc: string;
  timestamp?: Date;
  location?: string | null;
  reader_id?: string | null;
  status: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  rssi?: string | null;
  count?: number | null;
  device_id?: string | null;
  session_id?: string | null;
  parent_tag?: number | null;
}

export interface UpdateRfidData {
  epc?: string;
  timestamp?: Date;
  location?: string | null;
  reader_id?: string | null;
  status?: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  rssi?: string | null;
  count?: number | null;
  device_id?: string | null;
  session_id?: string | null;
  parent_tag?: number | null;
}

export const rfidApi = {
  // Get all RFID tags with pagination and filtering
  getAll: async (params: RfidQueryParams = {}): Promise<RfidResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/rfid${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching RFID tags:', error);
      throw error;
    }
  },

  // Get single RFID tag by ID
  getById: async (id: number): Promise<IRfidTag> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RFID tag:', error);
      throw error;
    }
  },

  // Create new RFID tag
  create: async (data: CreateRfidData): Promise<IRfidTag> => {
    try {
      const response = await apiRequest('/api/v1/rfid', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating RFID tag:', error);
      throw error;
    }
  },

  // Update RFID tag
  update: async (id: number, data: UpdateRfidData): Promise<IRfidTag> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating RFID tag:', error);
      throw error;
    }
  },

  // Delete RFID tag
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/rfid/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting RFID tag:', error);
      throw error;
    }
  },

  // Get RFID tags by status
  getByStatus: async (status: string): Promise<IRfidTag[]> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RFID tags by status:', error);
      throw error;
    }
  },

  // Assign RFID tag to item
  assignToItem: async (id: number): Promise<IRfidTag> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/${id}/assign`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning RFID tag:', error);
      throw error;
    }
  },

  // Unassign RFID tag from item
  unassign: async (id: number): Promise<IRfidTag> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/${id}/unassign`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error unassigning RFID tag:', error);
      throw error;
    }
  },

  // Create multiple RFID tags with duplicate checking
  createBulk: async (dataArray: CreateRfidData[]): Promise<{
    created: IRfidTag[];
    duplicates: string[];
    errors: any[];
    summary: {
      total: number;
      created: number;
      duplicates: number;
      errors: number;
    };
  }> => {
    try {
      const response = await apiRequest('/api/v1/rfid/bulk', {
        method: 'POST',
        body: JSON.stringify(dataArray),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating bulk RFID tags:', error);
      throw error;
    }
  },

  // Check if EPC is duplicate
  checkDuplicate: async (epc: string): Promise<{
    epc: string;
    isDuplicate: boolean;
    available: boolean;
  }> => {
    try {
      const response = await apiRequest(`/api/v1/rfid/check-duplicate/${encodeURIComponent(epc)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking duplicate EPC:', error);
      throw error;
    }
  }
};

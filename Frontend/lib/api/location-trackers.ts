import axiosInstance from '../axios';

export interface ILocationTracker {
  id: number;
  location_code: string;
  po_number: string;
  item_number: string;
  quantity: number;
  status: 'in' | 'out';
  created_at: string;
  updated_at: string;
  location_name?: string;
  item_description?: string;
  /** RFID tag / EPC */
  epc?: string;
}

export interface ILocationTrackerFilters {
  searchTerm?: string;
  /** RFID / EPC (partial match) */
  epc?: string;
  location_code?: string;
  po_number?: string;
  item_number?: string;
  status?: 'in' | 'out';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ILocationTrackerResponse {
  success: boolean;
  message: string;
  data: ILocationTracker[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ILocationTrackerStats {
  total_trackers: number;
  current_in: number;
  current_out: number;
  recent_activity: number;
}

export interface ILocationStatus {
  location_code: string;
  po_number: string;
  item_number: string;
  last_status: 'in' | 'out';
  last_updated: string;
  location_name?: string;
}

export const locationTrackersApi = {
  // Get all location trackers with filters and pagination
  getLocationTrackers: async (filters: ILocationTrackerFilters = {}): Promise<ILocationTrackerResponse> => {
    const response = await axiosInstance.get('/location-trackers', { params: filters });
    return response.data;
  },

  // Create new location tracker
  createLocationTracker: async (data: {
    location_code: string;
    po_number: string;
    item_number: string;
    quantity: number;
    status: 'in' | 'out';
  }): Promise<{ success: boolean; message: string; data: ILocationTracker }> => {
    const response = await axiosInstance.post('/location-trackers', data);
    return response.data;
  },

  // Get location tracker statistics
  getLocationTrackerStats: async (): Promise<{ success: boolean; message: string; data: ILocationTrackerStats }> => {
    const response = await axiosInstance.get('/location-trackers/stats');
    return response.data;
  },

  // Get current location status
  getCurrentLocationStatus: async (): Promise<{ success: boolean; message: string; data: ILocationStatus[] }> => {
    const response = await axiosInstance.get('/location-trackers/current-status');
    return response.data;
  },

  // Get location trackers by location
  getLocationTrackerByLocation: async (locationCode: string): Promise<{ success: boolean; message: string; data: ILocationTracker[] }> => {
    const response = await axiosInstance.get(`/location-trackers/location/${locationCode}`);
    return response.data;
  },
};

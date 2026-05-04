export interface ILocationTrackerRow {
  id: number;
  location_code: string;
  location_name: string | null;
  po_number: string;
  item_number: string;
  item_description: string | null;
  quantity: number;
  status: 'in' | 'out';
  epc: string;
  created_at: string;
  updated_at: string;
}

export interface ILocationTrackerStats {
  total_trackers: number;
  current_in: number;
  current_out: number;
  recent_activity: number;
}

export interface ILocationStatusRow {
  location_code: string;
  location_name: string | null;
  po_number: string;
  item_number: string;
  last_status: 'in' | 'out';
  last_updated: string;
  epc?: string;
}

export interface IListFilters {
  searchTerm?: string;
  /** Dedicated RFID / EPC filter (ILIKE partial match). */
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

export interface IListResponse {
  data: ILocationTrackerRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

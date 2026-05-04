import axiosInstance from '../axios';

export interface IStock {
  id: number;
  po_number: string;
  item_number: string;
  lot_no: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  item_description?: string;
  po_date?: string;
  last_location_status?: 'in' | 'out';
  last_location_time?: string;
  last_location_name?: string;
}

export interface IStockFilters {
  searchTerm?: string;
  po_number?: string;
  item_number?: string;
  lot_no?: string;
}

export interface IStockStats {
  total_items: number;
  total_quantity: number;
  unique_items: number;
  unique_pos: number;
  recent_updates: number;
}

export interface IStockSummary {
  item_number: string;
  item_description: string;
  total_quantity: number;
  lot_count: number;
  po_count: number;
  last_updated: string;
}

export interface ILiveStockData {
  stats: IStockStats;
  summary: IStockSummary[];
  last_updated: string;
}

export interface IAggregatedStock {
  item_number: string;
  item_description: string;
  lot_no: string;
  total_quantity: number;
  epc_count: number;
  po_count: number;
  last_updated: string;
}

export const stockApi = {
  // Get all stocks with filters
  getStocks: async (filters: IStockFilters = {}): Promise<{ success: boolean; message: string; data: IStock[] }> => {
    const response = await axiosInstance.get('/stock', { params: filters });
    return response.data;
  },

  // Get stock statistics
  getStockStats: async (): Promise<{ success: boolean; message: string; data: IStockStats }> => {
    const response = await axiosInstance.get('/stock/stats');
    return response.data;
  },

  // Get stock summary
  getStockSummary: async (): Promise<{ success: boolean; message: string; data: IStockSummary[] }> => {
    const response = await axiosInstance.get('/stock/summary');
    return response.data;
  },

  // Get live stock data for dashboard
  getLiveStockData: async (): Promise<{ success: boolean; message: string; data: ILiveStockData }> => {
    const response = await axiosInstance.get('/stock/live');
    return response.data;
  },

  // Get stock by PO, item, and lot
  getStockByPoItemLot: async (po_number: string, item_number: string, lot_no: string): Promise<{ success: boolean; message: string; data: IStock | null }> => {
    const response = await axiosInstance.get(`/stock/${po_number}/${item_number}/${lot_no}`);
    return response.data;
  },

  // Get aggregated stocks by item and lot
  getAggregatedStocks: async (): Promise<{ success: boolean; message: string; data: IAggregatedStock[] }> => {
    const response = await axiosInstance.get('/stock/aggregated');
    return response.data;
  },
};

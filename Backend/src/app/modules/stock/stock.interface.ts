export interface IStockRow {
  id: number;
  po_number: string;
  item_number: string;
  lot_no: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  item_description?: string | null;
  po_date?: string | null;
  last_location_status?: 'in' | 'out' | null;
  last_location_time?: string | null;
  last_location_name?: string | null;
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

export interface IStockListFilters {
  searchTerm?: string;
  po_number?: string;
  item_number?: string;
  lot_no?: string;
}

/** One inbound scan line contributing to stock (RFID + optional serial range). */
export interface IStockInboundScanRow {
  id: number;
  epc: string;
  status: 'in' | 'out';
  quantity: number;
  serial_start: string | null;
  serial_end: string | null;
  scanned_at: string;
  location_name: string | null;
  location_code: string | null;
  /** `po_code` = master row from `po_codes` when no gate scan exists yet for this stock line. */
  row_source?: 'inbound_scan' | 'po_code';
}

/** Inbound scan line for a PO (all items/lots under that PO). */
export interface IStockInboundScanRowByPo extends IStockInboundScanRow {
  item_number: string;
  item_description: string;
}

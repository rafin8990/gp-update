export type InboundStatus = 'in' | 'out';

export interface IScanRequest {
  epc: string;
  rssi?: string | number;
  deviceId?: string;
  value?: number | string;
  timestamp?: number | string;
}

export interface IInboundScan {
  id: number;
  epc: string;
  po_code_id: number;
  po_header_id: number;
  item_id: number;
  location_id?: number | null;
  status: InboundStatus;
  rssi?: string | null;
  device_id?: string | null;
  quantity?: number | null;
  serial_start?: string | number | null;
  serial_end?: string | number | null;
  scanned_at?: string | null;
  created_at?: string | null;
}

export interface IInboundLiveItem {
  /** inbound_scans.id — for dashboards / location tracker rows */
  id?: number;
  scan_id?: number;
  po_number: string;
  lot_no?: string;
  location_name?: string | null;
  location_code?: string | null;
  item_number: string;
  item_description?: string | null;
  ordered_quantity?: number | null;
  quantity: number;
  epc: string;
  serial_start?: string | null;
  serial_end?: string | null;
  status?: InboundStatus;
  updated_at?: string | null;
  /** Alias for clients expecting created_at */
  created_at?: string | null;
  timestamp?: string | null;
}

export interface IInboundItemSummary {
  item_number: string;
  item_description?: string | null;
  order_total_quantity?: number | null;
  received_total_quantity: number;
  serial_start?: string | null;
  serial_end?: string | null;
}

export interface IInboundPoSummary {
  po_line_id?: number | null;
  line_number?: number | null;
  item_id: number;
  item_number: string;
  item_description?: string | null;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  progress_percent: number;
  serial_start?: string | null;
  serial_end?: string | null;
}

export interface IInboundLookupRow {
  id: number;
  po_header_id: number;
  item_id: number;
  rfid_code: string;
  serial_start?: string | null;
  serial_end?: string | null;
  quantity?: number | null;
  item_description?: string | null;
  po_number: string;
  location_id?: number | null;
  location_name?: string | null;
  location_code?: string | null;
  ordered_quantity?: number | null;
}

export interface IInboundScanResponse {
  deduped: boolean;
  data?: IInboundLiveItem;
}

export interface IInboundListFilters {
  epc?: string;
  po_header_id?: number;
  location_id?: number;
  status?: InboundStatus;
  limit?: number;
  offset?: number;
}

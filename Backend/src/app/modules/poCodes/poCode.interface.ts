export interface IPoCode {
  id: number;
  po_header_id: number;
  item_id: number;
  rfid_code: string;
  serial_start?: string | number | null;
  serial_end?: string | number | null;
  quantity?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ICreatePoCodeRequest {
  po_header_id: number;
  item_id: number;
  rfid_code?: string; // Optional - will be auto-generated if not provided
  serial_start?: string | number | null;
  serial_end?: string | number | null;
  quantity?: number | null;
}

export interface IUpdatePoCodeRequest {
  po_header_id?: number;
  item_id?: number;
  rfid_code?: string;
  serial_start?: string | number | null;
  serial_end?: string | number | null;
  quantity?: number | null;
}

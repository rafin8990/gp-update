export type OrderStatus = 'pending' | 'partially_received' | 'full_received';

export interface IPurchaseOrder {
  po_header_id: number;
  po_number: string;
  status_code: string;
  status_name?: string | null;
  order_status?: OrderStatus;
  procurement_bu_id?: number | null;
  procurement_bu_name?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_site_id?: number | null;
  supplier_site_code?: string | null;
  buyer_id?: number | null;
  buyer_name?: string | null;
  ship_to_location_id?: number | null;
  ship_to_location_code?: string | null;
  ship_to_address?: string | null;
  currency_code?: string | null;
  ordered_amount?: string | null;
  tax_amount?: string | null;
  total_amount?: string | null;
  order_date?: string | null;
  created_at?: string;
  updated_at?: string;
  source_system?: string | null;
  raw_payload?: any;
  inserted_at?: string;
  synced_at?: string | null;
}

export interface IPurchaseOrderLine {
  po_line_id: number;
  po_header_id: number;
  line_number: number;
  line_status_code: string;
  line_status_name?: string | null;
  line_type?: string | null;
  item_id?: number | null;
  item_code?: string | null;
  item_description?: string | null;
  category_code?: string | null;
  uom_code?: string | null;
  uom_name?: string | null;
  quantity?: string | null;
  unit_price?: string | null;
  currency_code?: string | null;
  line_amount?: string | null;
  tax_amount?: string | null;
  total_amount?: string | null;
  serial_start?: string | null;
  serial_end?: string | null;
  created_at?: string;
  updated_at?: string;
  raw_payload?: any;
  inserted_at?: string;
  synced_at?: string | null;
}

export interface ICreatePurchaseOrderWithLinesRequest {
  po: Omit<IPurchaseOrder, 'created_at' | 'updated_at' | 'inserted_at' | 'synced_at'>;
  lines: Array<
    Omit<IPurchaseOrderLine, 'created_at' | 'updated_at' | 'inserted_at' | 'synced_at'>
  >;
}

export interface IUpdatePurchaseOrderWithLinesRequest {
  po_header_id: number;
  po: Partial<Omit<IPurchaseOrder, 'po_header_id'>>;
  lines?: Array<
    Partial<Omit<IPurchaseOrderLine, 'po_header_id'>> & {
      po_line_id?: number;
      _action?: 'create' | 'update' | 'delete';
    }
  >;
}


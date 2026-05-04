export interface IPoTransactionReceipt {
  id: number;
  po_header_id: number;
  interface_line_number: string;
  transaction_type: string;
  transaction_date?: string | null;
  source_document_code?: string | null;
  receipt_source_code?: string | null;
  header_interface_number?: string | null;
  parent_transaction_id?: string | null;
  organization_code?: string | null;
  document_number?: string | null;
  document_line_number?: string | null;
  document_schedule_number?: string | null;
  business_unit?: string | null;
  sub_inventory?: string | null;
  uom?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IPoLotDetail {
  id: number;
  po_header_id: number;
  interface_line_number: string;
  item_number: number;
  lot_number: string;
  transaction_quantity: string;
  expired_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ICreatePoTransactionReceiptWithLotsRequest {
  receipt: Omit<IPoTransactionReceipt, 'id' | 'created_at' | 'updated_at'>;
  lots: Array<Omit<IPoLotDetail, 'id' | 'created_at' | 'updated_at'>>;
}

export interface IUpdatePoTransactionReceiptWithLotsRequest {
  id: number;
  receipt: Partial<Omit<IPoTransactionReceipt, 'id'>>;
  lots?: Array<
    Partial<Omit<IPoLotDetail, 'id'>> & {
      id?: number;
      _action?: 'create' | 'update' | 'delete';
    }
  >;
}

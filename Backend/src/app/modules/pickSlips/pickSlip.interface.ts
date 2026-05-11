export interface IPackItemInput {
  item_number: string;
  epc: string;
}

export interface IFifoEpcRow {
  epc: string;
  serial_start: string | null;
  serial_end: string | null;
  stock_lot_number: string;
  stock_po_number: string;
  /** Exact `po_codes.quantity` as stored (string avoids JSON number drift). */
  quantity: string | null;
}

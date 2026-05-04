export type ApprovalStatus = 'pending' | 'received';

export interface IPoLotReceiveSummaryRow {
  po_lot_detail_id: number;
  po_header_id: number;
  po_number: string;
  interface_line_number: string;
  item_id: number;
  item_description: string | null;
  lot_number: string;
  ordered_quantity: number;
  allocated_scanned_quantity: number;
  expired_date: string | null;
  approval_status: ApprovalStatus;
  can_approve: boolean;
}

export interface IApproveLotReceivePayload {
  po_lot_detail_id: number;
}

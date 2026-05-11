export type RequisitionStatus = 'pending' | 'complete' | 'cancel' | 'received';

export interface IRequisitionLineRow {
  id: number;
  requisition_id: number;
  item_id: string;
  /** Same as item_id; for frontend `IRequisitionItem.item_number` */
  item_number: string;
  item_type: string | null;
  requested_quantity: number;
  /** Alias for `requested_quantity` (frontend) */
  quantity: number;
  source_subinventory: string | null;
  source_location_code: string | null;
  uom: string | null;
}

export interface IRequisitionRow {
  id: number;
  requisition_number: string;
  source_order: string | null;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description: string | null;
  status: RequisitionStatus;
  transport_type_1: string | null;
  transport_type_2: string | null;
  vehicle_1: string | null;
  vehicle_2: string | null;
  created_at: string;
  updated_at: string;
  items?: IRequisitionLineRow[];
}

export interface ICreateRequisitionLineInput {
  item_number: string;
  item_type?: string;
  quantity: number;
  uom?: string;
  source_subinventory?: string;
  source_location_code?: string;
}

export interface ICreateRequisitionInput {
  requisition_number: string;
  source_order?: string;
  distribution_partner_name: string;
  address: string;
  organization_code: string;
  description?: string | null;
  status?: RequisitionStatus;
  transport_type_1?: string;
  transport_type_2?: string;
  vehicle_1?: string;
  vehicle_2?: string;
  items: ICreateRequisitionLineInput[];
}

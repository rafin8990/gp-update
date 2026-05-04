import axiosInstance from '../axios';
import { IPurchaseOrder, IPurchaseOrderLine } from './purchase-orders.types';

// Types matching backend structure
export interface IPurchaseOrderWithLines {
  po: IPurchaseOrder | null;
  lines: IPurchaseOrderLine[];
}

export interface PurchaseOrderQueryParams {
  status_code?: string;
  supplier_id?: number;
  po_number?: string;
  limit?: number;
  offset?: number;
}

// Request types with numbers (for create/update)
interface CreatePurchaseOrderPO {
  po_header_id: number;
  po_number: string;
  status_code: string;
  status_name?: string | null;
  order_status?: 'pending' | 'partially_received' | 'full_received';
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
  ordered_amount?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  order_date?: string | null;
  source_system?: string | null;
  raw_payload?: any;
}

interface CreatePurchaseOrderLine {
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
  quantity?: number | null;
  unit_price?: number | null;
  currency_code?: string | null;
  line_amount?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  raw_payload?: any;
}

export interface CreatePurchaseOrderWithLinesData {
  po: CreatePurchaseOrderPO;
  lines: CreatePurchaseOrderLine[];
}

export interface UpdatePurchaseOrderWithLinesData {
  po: Partial<Omit<IPurchaseOrder, 'po_header_id'>>;
  lines?: Array<
    Partial<Omit<IPurchaseOrderLine, 'po_header_id'>> & {
      po_line_id?: number;
      _action?: 'create' | 'update' | 'delete';
    }
  >;
}

export interface PurchaseOrderListResponse {
  success: boolean;
  message: string;
  data: IPurchaseOrder[];
  meta?: {
    total: number;
    limit?: number;
    offset?: number;
  };
}

export interface PurchaseOrderResponse {
  success: boolean;
  message: string;
  data: IPurchaseOrderWithLines;
}

export type PoLotApprovalStatus = 'pending' | 'received';

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
  approval_status: PoLotApprovalStatus;
  can_approve: boolean;
}

export const purchaseOrdersApi = {
  // Get all purchase orders with pagination and filtering
  getAll: async (params: PurchaseOrderQueryParams = {}): Promise<PurchaseOrderListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status_code) {
        queryParams.append('status_code', params.status_code);
      }
      if (params.supplier_id) {
        queryParams.append('supplier_id', params.supplier_id.toString());
      }
      if (params.po_number) {
        queryParams.append('po_number', params.po_number);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/purchase-orders${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosInstance.get<PurchaseOrderListResponse>(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch purchase orders');
    }
  },

  // Get single purchase order by ID (with lines)
  getById: async (po_header_id: number): Promise<IPurchaseOrderWithLines> => {
    try {
      const response = await axiosInstance.get<PurchaseOrderResponse>(`/purchase-orders/${po_header_id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch purchase order');
    }
  },

  // Create purchase order with lines
  createWithLines: async (data: CreatePurchaseOrderWithLinesData): Promise<IPurchaseOrderWithLines> => {
    try {
      const response = await axiosInstance.post<PurchaseOrderResponse>('/purchase-orders/with-lines', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      throw new Error(error.response?.data?.message || 'Failed to create purchase order');
    }
  },

  // Update purchase order with lines
  updateWithLines: async (po_header_id: number, data: UpdatePurchaseOrderWithLinesData): Promise<IPurchaseOrderWithLines> => {
    try {
      const response = await axiosInstance.put<PurchaseOrderResponse>(`/purchase-orders/${po_header_id}/with-lines`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      throw new Error(error.response?.data?.message || 'Failed to update purchase order');
    }
  },

  // Delete purchase order
  delete: async (po_header_id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/purchase-orders/${po_header_id}`);
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete purchase order');
    }
  },

  getLotReceiveSummary: async (po_header_id: number): Promise<IPoLotReceiveSummaryRow[]> => {
    try {
      const response = await axiosInstance.get<{ success: boolean; data: IPoLotReceiveSummaryRow[] }>(
        `/purchase-orders/${po_header_id}/lot-receive-summary`,
      );
      return response.data.data ?? [];
    } catch (error: any) {
      console.error('Error fetching lot receive summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch lot receive summary');
    }
  },

  approveLotReceive: async (
    po_header_id: number,
    payload: { po_lot_detail_id: number },
  ): Promise<{ quantity_posted: number }> => {
    try {
      const response = await axiosInstance.post<{ success: boolean; data: { quantity_posted: number } }>(
        `/purchase-orders/${po_header_id}/approve-lot-receive`,
        payload,
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Error approving lot receive:', error);
      throw new Error(error.response?.data?.message || 'Failed to approve lot receive');
    }
  },
};

// Legacy interfaces for backward compatibility with existing page
export interface IPurchaseOrderWithItems {
  id?: number;
  po_header_id: number;
  po_number: string;
  po_description?: string | null;
  supplier_name: string;
  po_type?: string | null;
  status?: 'pending' | 'partial' | 'received' | 'cancelled';
  created_at?: Date | string;
  updated_at?: Date | string;
  items?: IPoItem[];
  total_items?: number;
  total_ordered_quantity?: number;
  total_received_quantity?: number;
  received_at?: Date | null;
}

export interface IPoItem {
  id?: number;
  po_id?: number;
  po_line_id?: number;
  item_number: string;
  item_code?: string;
  item_description?: string;
  item_type?: string;
  primary_uom?: string;
  uom_code?: string;
  item_status?: string;
  quantity: number;
  ordered_quantity?: number;
  received_quantity?: number;
  created_at?: Date;
  updated_at?: Date;
}

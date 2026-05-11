import axiosInstance from '../axios';

export interface IPoTransactionReceipt {
  id: number;
  po_header_id: number;
  interface_line_number: string;
  transaction_type?: string;
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
  id?: number;
  po_header_id: number;
  interface_line_number?: string;
  item_number: number;
  lot_number: string;
  transaction_quantity: number;
  expired_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IReceiptWithLots {
  receipt: IPoTransactionReceipt;
  lots: IPoLotDetail[];
}

export interface ICreateReceiptWithLotsPayload {
  receipt: Omit<IPoTransactionReceipt, 'id' | 'created_at' | 'updated_at' | 'interface_line_number'> & {
    interface_line_number?: string;
  };
  lots: Omit<IPoLotDetail, 'id' | 'created_at' | 'updated_at' | 'interface_line_number'>[];
}

export interface IUpdateReceiptWithLotsPayload {
  receipt: Partial<Omit<IPoTransactionReceipt, 'id'>>;
  lots?: Array<Partial<IPoLotDetail> & { id?: number; _action?: 'create' | 'update' | 'delete' }>;
}

interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string | null;
  meta?: {
    page: number;
    limit: number;
    total: number;
  } | null;
  data: T;
}

export const poTransactionReceiptsApi = {
  getAll: async (params: {
    po_header_id?: number;
    interface_line_number?: string;
    transaction_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<IApiResponse<IPoTransactionReceipt[]>> => {
    const query = new URLSearchParams();
    if (params.po_header_id) query.append('po_header_id', String(params.po_header_id));
    if (params.interface_line_number) query.append('interface_line_number', params.interface_line_number);
    if (params.transaction_type) query.append('transaction_type', params.transaction_type);
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));

    const endpoint = `/po-transaction-receipts${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await axiosInstance.get<IApiResponse<IPoTransactionReceipt[]>>(endpoint);
    return response.data;
  },

  getById: async (id: number): Promise<IReceiptWithLots> => {
    const response = await axiosInstance.get<IApiResponse<IReceiptWithLots>>(`/po-transaction-receipts/${id}`);
    return response.data.data;
  },

  createWithLots: async (payload: ICreateReceiptWithLotsPayload): Promise<IReceiptWithLots> => {
    const response = await axiosInstance.post<IApiResponse<IReceiptWithLots>>(
      '/po-transaction-receipts/with-lots',
      payload,
    );
    return response.data.data;
  },

  createReceipt: async (
    payload: ICreateReceiptWithLotsPayload['receipt'],
  ): Promise<IPoTransactionReceipt> => {
    const response = await axiosInstance.post<IApiResponse<IPoTransactionReceipt>>(
      '/po-transaction-receipts',
      payload,
    );
    return response.data.data;
  },

  updateWithLots: async (id: number, payload: IUpdateReceiptWithLotsPayload): Promise<IReceiptWithLots> => {
    const response = await axiosInstance.put<IApiResponse<IReceiptWithLots>>(
      `/po-transaction-receipts/${id}/with-lots`,
      payload,
    );
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/po-transaction-receipts/${id}`);
  },

  /** Downloads filled Oracle .xlsm for the given receipt id (blob). */
  downloadOracleExport: async (receiptId: number): Promise<void> => {
    const response = await axiosInstance.get<Blob>(`/po-transaction-receipts/${receiptId}/oracle-export`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    let filename = `oracle-rcv-${receiptId}.xlsm`;
    if (disposition) {
      const m = /filename="([^"]+)"/.exec(disposition) || /filename=([^;]+)/.exec(disposition);
      if (m) filename = m[1].trim().replace(/^"|"$/g, '');
    }
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

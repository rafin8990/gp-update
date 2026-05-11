const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const authHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const t = localStorage.getItem('authToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const PICK_SLIPS_BASE = '/api/v1/pick-slips';

/** Row from `GET /pick-slips/fifo-epcs` */
export interface IFifoEpcRow {
  epc: string;
  serial_start: string | null;
  serial_end: string | null;
  stock_lot_number: string;
  stock_po_number: string;
  /** Exact `po_codes.quantity` from DB (string). */
  quantity?: string | null;
}

export interface IPickSlipItem {
  requisition_pack_id?: number;
  item_number: string;
  epc: string;
  stock_po_number?: string | null;
  stock_lot_number?: string | null;
  serial_snapshot?: string | null;
  item_description?: string | null;
}

/** @deprecated use IPickSlipItem */
export type IPackItem = IPickSlipItem;

export interface IPickSlip {
  id?: number;
  pick_slip_number?: string;
  status?: string;
  requisition_id: number;
  requisition_status?: 'pending' | 'complete' | 'cancel' | 'received';
  requisition_number?: string;
  items?: IPickSlipItem[];
}

/** @deprecated use IPickSlip */
export type IPack = IPickSlip;

export interface PickSlipQueryParams {
  requisition_id?: number;
  item_number?: string;
  epc?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** @deprecated use PickSlipQueryParams */
export type PackQueryParams = PickSlipQueryParams;

export interface PickSlipListResponse {
  data: IPickSlip[];
  meta?: { page: number; limit: number; total: number; totalPages?: number; hasNext?: boolean; hasPrev?: boolean };
}

/** @deprecated use PickSlipListResponse */
export type PackResponse = PickSlipListResponse;

export const pickSlipsApi = {
  getFifoEpcs: async (
    item_number: string,
    limit = 800,
  ): Promise<{ success: boolean; data: IFifoEpcRow[] }> => {
    const qs = new URLSearchParams({ item_number, limit: String(limit) });
    return apiRequest(`${PICK_SLIPS_BASE}/fifo-epcs?${qs.toString()}`);
  },

  getAll: async (params: PickSlipQueryParams = {}): Promise<PickSlipListResponse> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    return apiRequest(`${PICK_SLIPS_BASE}${qs.toString() ? `?${qs}` : ''}`);
  },
  getById: async (id: number): Promise<IPickSlip> => {
    const res = await apiRequest(`${PICK_SLIPS_BASE}/${id}`);
    return res.data;
  },
  create: async (data: {
    requisition_id: number;
    items: Omit<IPickSlipItem, 'requisition_pack_id'>[];
  }): Promise<IPickSlip> => {
    const res = await apiRequest(PICK_SLIPS_BASE, { method: 'POST', body: JSON.stringify(data) });
    return res.data;
  },
  update: async (
    id: number,
    data: Partial<{ requisition_id: number; items: Omit<IPickSlipItem, 'requisition_pack_id'>[] }>,
  ): Promise<IPickSlip> => {
    const res = await apiRequest(`${PICK_SLIPS_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest(`${PICK_SLIPS_BASE}/${id}`, { method: 'DELETE' });
  },

  exportSalesOrderXlsx: async (pickSlipId: number): Promise<void> => {
    const url = `${API_BASE_URL}${PICK_SLIPS_BASE}/${pickSlipId}/export`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...authHeaders() },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `pick-slip-${pickSlipId}.xlsx`;
    a.click();
    URL.revokeObjectURL(href);
  },
};

/** Legacy alias — same as `pickSlipsApi` */
export const packsApi = pickSlipsApi;

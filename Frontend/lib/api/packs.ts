const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
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

export interface IPackItem { requisition_pack_id?: number; item_number: string; epc: string }
export interface IPack { id?: number; requisition_id: number; requisition_status?: 'pending'|'complete'|'cancel'; requisition_number?: string; items?: IPackItem[] }
export interface PackQueryParams { requisition_id?: number; item_number?: string; epc?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc'|'desc' }
export interface PackResponse { data: IPack[]; meta?: { page: number; limit: number; total: number; totalPages?: number; hasNext?: boolean; hasPrev?: boolean } }

export const packsApi = {
  getAll: async (params: PackQueryParams = {}): Promise<PackResponse> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) qs.append(k, String(v)); });
    return apiRequest(`/api/v1/packs${qs.toString() ? `?${qs}` : ''}`);
  },
  getById: async (id: number): Promise<IPack> => {
    const res = await apiRequest(`/api/v1/packs/${id}`);
    return res.data;
  },
  create: async (data: { requisition_id: number; items: Omit<IPackItem,'requisition_pack_id'>[] }): Promise<IPack> => {
    const res = await apiRequest('/api/v1/packs', { method: 'POST', body: JSON.stringify(data) });
    return res.data;
  },
  update: async (id: number, data: Partial<{ requisition_id: number; items: Omit<IPackItem,'requisition_pack_id'>[] }>): Promise<IPack> => {
    const res = await apiRequest(`/api/v1/packs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiRequest(`/api/v1/packs/${id}`, { method: 'DELETE' });
  },
};



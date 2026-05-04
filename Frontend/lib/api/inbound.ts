const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  } | null;
};

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

const unwrapData = <T>(response: ApiEnvelope<T> | T): T => {
  if (
    response &&
    typeof response === 'object' &&
    'data' in (response as ApiEnvelope<T>)
  ) {
    return ((response as ApiEnvelope<T>).data ?? null) as T;
  }

  return response as T;
};

export interface IInboundItem {
  epc: string;
  lot_no?: string;
  quantity: number;
  item_number: string;
  item_description?: string;
  ordered_quantity?: number;
  serial_start?: string;
  serial_end?: string;
}

export interface IInboundRecord {
  id: number;
  po_number: string;
  items: IInboundItem[];
  received_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InboundQueryParams {
  epc?: string;
  po_header_id?: number;
  location_id?: number;
  status?: 'in' | 'out';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface InboundLiveSummaryItem {
  po_number: string;
  lot_no?: string;
  location_name?: string | null;
  location_code?: string | null;
  item_number: string;
  item_description?: string;
  ordered_quantity?: number;
  quantity: number;
  epc: string;
  serial_start?: string;
  serial_end?: string;
  status?: 'in' | 'out';
  updated_at?: string;
}

export interface InboundScanPayload {
  epc: string;
  deviceId?: string;
  rssi?: string;
  value?: number | string;
  Value?: number | string;
  user_id?: number | string;
}

export interface InboundPoSummaryItem {
  po_line_id?: number | null;
  line_number?: number | null;
  item_id: number;
  item_number: string;
  item_description?: string | null;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  progress_percent: number;
  serial_start?: string | null;
  serial_end?: string | null;
}

export interface InboundExportParams {
  po_header_id?: number;
  epc?: string;
  location_id?: number;
  status?: 'in' | 'out';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface InboundResponse {
  data: IInboundRecord[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

type InboundMovementRow = InboundLiveSummaryItem;

const groupInboundMovements = (rows: InboundMovementRow[]): IInboundRecord[] => {
  const records = new Map<string, IInboundRecord>();

  rows.forEach((row, index) => {
    const recordKey = `${row.po_number}`;
    const existing = records.get(recordKey);

    const item: IInboundItem = {
      epc: row.epc,
      lot_no: row.lot_no,
      quantity: Number(row.quantity ?? 0),
      item_number: row.item_number,
      item_description: row.item_description,
      ordered_quantity: row.ordered_quantity,
      serial_start: row.serial_start,
      serial_end: row.serial_end,
    };

    if (!existing) {
      records.set(recordKey, {
        id: index + 1,
        po_number: row.po_number,
        items: [item],
        received_at: row.updated_at,
        updated_at: row.updated_at,
      });
      return;
    }

    existing.items.push(item);
    if (row.updated_at && (!existing.updated_at || new Date(row.updated_at) > new Date(existing.updated_at))) {
      existing.updated_at = row.updated_at;
      existing.received_at = row.updated_at;
    }
  });

  return Array.from(records.values()).sort((a, b) => {
    const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return timeA - timeB;
  });
};

export interface InboundItemSummary {
  item_number: string;
  item_description?: string;
  order_total_quantity?: number;
  received_total_quantity: number;
  serial_start?: string;
  serial_end?: string;
}

export const inboundApi = {
  getAll: async (params: InboundQueryParams = {}): Promise<InboundResponse> => {
    const qs = new URLSearchParams();
    const normalizedParams = {
      ...params,
      offset:
        params.offset ??
        (params.page && params.limit ? (params.page - 1) * params.limit : undefined),
    };

    Object.entries(normalizedParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    qs.append('format', 'json');
    const endpoint = `/api/v1/inbound/export?${qs.toString()}`;
    const response = await apiRequest(endpoint);
    const rows = unwrapData<InboundMovementRow[]>(response) || [];

    return {
      data: groupInboundMovements(rows),
      meta:
        (response as ApiEnvelope<InboundMovementRow[]>)?.meta ?? {
          page: params.page ?? 1,
          limit: params.limit ?? rows.length,
          total: rows.length,
        },
    };
  },
  getLiveSummary: async (limit = 50): Promise<InboundLiveSummaryItem[]> => {
    const endpoint = `/api/v1/inbound/live?limit=${limit}`;
    const response = await apiRequest(endpoint);
    return unwrapData<InboundLiveSummaryItem[]>(response) || [];
  },
  scan: async (payload: InboundScanPayload) => {
    const response = await apiRequest(`/api/v1/inbound/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return unwrapData(response);
  },
  getItemWiseSummary: async (): Promise<InboundItemSummary[]> => {
    const endpoint = `/api/v1/inbound/item-summary`;
    const response = await apiRequest(endpoint);
    return unwrapData<InboundItemSummary[]>(response) || [];
  },
  getPoSummary: async (poHeaderId: number): Promise<InboundPoSummaryItem[]> => {
    const endpoint = `/api/v1/inbound/po/${poHeaderId}/summary`;
    const response = await apiRequest(endpoint);
    return unwrapData<InboundPoSummaryItem[]>(response) || [];
  },
  exportMovements: async (params: InboundExportParams = {}, format: 'json' | 'csv' = 'json') => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    qs.append('format', format);
    const endpoint = `/api/v1/inbound/export?${qs.toString()}`;
    if (format === 'json') {
      const response = await apiRequest(endpoint);
      return unwrapData<InboundMovementRow[]>(response) || [];
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.text();
  },
};



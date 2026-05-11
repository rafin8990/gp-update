import axiosInstance from '../axios';

// Item interface matching backend schema
export interface IItem {
  item: number; // Primary key (bigint)
  description?: string | null;

  // Inventory
  inventory_organization?: string | null;
  primary_uom_name?: string | null;
  primary_uom_code?: string | null;
  item_status?: string | null;
  user_item_type?: string | null;
  item_class?: string | null;

  inventory_item?: boolean | null;
  stockable?: boolean | null;
  serial_generation?: string | null;
  lot_control?: string | null;

  // Costing
  costing_enabled?: boolean | null;
  inventory_asset_value?: boolean | null;
  including_in_rollup?: boolean | null;
  cost_of_goods_sold_account?: string | null;

  // Purchasing
  purchased?: boolean | null;
  purchasable?: boolean | null;
  match_approval_level?: string | null;
  invoice_match_option?: string | null;
  receipt_required?: boolean | null;
  inspection_required?: boolean | null;
  input_tax_classification_code?: string | null;
  expense_account?: string | null;
  receipt_routing?: string | null;

  // Receiving / Order Management
  customer_ordered?: boolean | null;
  shippable_item?: boolean | null;
  transfer_orders_enabled?: boolean | null;
  order_management_transactable?: boolean | null;
  returnable?: boolean | null;

  // Invoicing
  invoiceable_item?: boolean | null;
  invoice_enabled?: boolean | null;
  sales_account?: string | null;
  output_tax_classification_code?: string | null;

  // Item Categories (Catalogs)
  inventory_catalog?: string | null;
  inventory_catalog_name?: string | null;
  inventory_catalog_code?: string | null;
  inventory_catalog_description?: string | null;

  tax_catalog?: string | null;
  tax_catalog_name?: string | null;
  tax_catalog_code?: string | null;
  tax_catalog_description?: string | null;

  purchasing_catalog?: string | null;
  purchasing_catalog_name?: string | null;
  purchasing_catalog_code?: string | null;
  purchasing_catalog_description?: string | null;

  // Purchasing Category Hierarchy Details
  l1_description?: string | null;
  l2_description?: string | null;
  l3_description?: string | null;
  l4_description?: string | null;
  l5_description?: string | null;

  // Audit
  created_by?: string | null;
  creation_date?: string | null;
  last_update_by?: string | null;
  last_update_date?: string | null;

  // Agreement
  bpa_cpa_item?: boolean | null;
}

export interface ItemQueryParams {
  inventory_organization?: string;
  item_status?: string;
  primary_uom_code?: string;
  user_item_type?: string;
  limit?: number;
  offset?: number;
}

export interface CreateItemData {
  item: number; // Required
  description?: string | null;
  inventory_organization?: string | null;
  primary_uom_name?: string | null;
  primary_uom_code?: string | null;
  item_status?: string | null;
  user_item_type?: string | null;
  item_class?: string | null;
  inventory_item?: boolean | null;
  stockable?: boolean | null;
  serial_generation?: string | null;
  lot_control?: string | null;
  costing_enabled?: boolean | null;
  inventory_asset_value?: boolean | null;
  including_in_rollup?: boolean | null;
  cost_of_goods_sold_account?: string | null;
  purchased?: boolean | null;
  purchasable?: boolean | null;
  match_approval_level?: string | null;
  invoice_match_option?: string | null;
  receipt_required?: boolean | null;
  inspection_required?: boolean | null;
  input_tax_classification_code?: string | null;
  expense_account?: string | null;
  receipt_routing?: string | null;
  customer_ordered?: boolean | null;
  shippable_item?: boolean | null;
  transfer_orders_enabled?: boolean | null;
  order_management_transactable?: boolean | null;
  returnable?: boolean | null;
  invoiceable_item?: boolean | null;
  invoice_enabled?: boolean | null;
  sales_account?: string | null;
  output_tax_classification_code?: string | null;
  inventory_catalog?: string | null;
  inventory_catalog_name?: string | null;
  inventory_catalog_code?: string | null;
  inventory_catalog_description?: string | null;
  tax_catalog?: string | null;
  tax_catalog_name?: string | null;
  tax_catalog_code?: string | null;
  tax_catalog_description?: string | null;
  purchasing_catalog?: string | null;
  purchasing_catalog_name?: string | null;
  purchasing_catalog_code?: string | null;
  purchasing_catalog_description?: string | null;
  l1_description?: string | null;
  l2_description?: string | null;
  l3_description?: string | null;
  l4_description?: string | null;
  l5_description?: string | null;
  created_by?: string | null;
  creation_date?: string | null;
  last_update_by?: string | null;
  last_update_date?: string | null;
  bpa_cpa_item?: boolean | null;
}

export interface UpdateItemData extends Partial<Omit<CreateItemData, 'item'>> {}

export interface ItemResponse {
  success: boolean;
  message: string;
  data: IItem;
}

export interface ItemsListResponse {
  success: boolean;
  message: string;
  data: IItem[];
  meta?: {
    total: number;
    limit?: number;
    offset?: number;
  };
}

/** ERP master row uses `item` (number) + `description`, not `item_number` / `item_description`. */
export function getErpItemNumber(row: IItem): string {
  return String(row.item);
}

export function getErpItemDisplayLabel(row: IItem): string {
  const n = getErpItemNumber(row);
  const d = row.description?.trim() || 'N/A';
  return `${n} (${d})`;
}

export const itemsApi = {
  // Get all items with pagination and filtering
  getAll: async (params: ItemQueryParams = {}): Promise<ItemsListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.inventory_organization) {
        queryParams.append('inventory_organization', params.inventory_organization);
      }
      if (params.item_status) {
        queryParams.append('item_status', params.item_status);
      }
      if (params.primary_uom_code) {
        queryParams.append('primary_uom_code', params.primary_uom_code);
      }
      if (params.user_item_type) {
        queryParams.append('user_item_type', params.user_item_type);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset) {
        queryParams.append('offset', params.offset.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/items${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosInstance.get<ItemsListResponse>(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching items:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch items');
    }
  },

  // Get single item by ID
  getById: async (item: number): Promise<IItem> => {
    try {
      const response = await axiosInstance.get<ItemResponse>(`/items/${item}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching item:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch item');
    }
  },

  // Create new item
  create: async (data: CreateItemData): Promise<IItem> => {
    try {
      const response = await axiosInstance.post<ItemResponse>('/items', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating item:', error);
      throw new Error(error.response?.data?.message || 'Failed to create item');
    }
  },

  // Update item
  update: async (item: number, data: UpdateItemData): Promise<IItem> => {
    try {
      const response = await axiosInstance.put<ItemResponse>(`/items/${item}`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating item:', error);
      throw new Error(error.response?.data?.message || 'Failed to update item');
    }
  },

  // Delete item
  delete: async (item: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/items/${item}`);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete item');
    }
  },
};

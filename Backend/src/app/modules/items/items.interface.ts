export interface IItem {
  item: number;
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

export interface ICreateItemRequest extends Omit<IItem, 'creation_date' | 'last_update_date'> {
  item: number;
}

export interface IUpdateItemRequest extends Partial<Omit<IItem, 'item' | 'creation_date' | 'last_update_date'>> {}

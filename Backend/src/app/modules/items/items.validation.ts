import { z } from 'zod';

// Base body schema for item
const baseItemBodySchema = z.object({
  item: z.number().int().optional(),
  description: z.string().nullable().optional(),

  // Inventory
  inventory_organization: z.string().max(30).nullable().optional(),
  primary_uom_name: z.string().max(50).nullable().optional(),
  primary_uom_code: z.string().max(10).nullable().optional(),
  item_status: z.string().max(30).nullable().optional(),
  user_item_type: z.string().max(50).nullable().optional(),
  item_class: z.string().max(100).nullable().optional(),

  inventory_item: z.boolean().nullable().optional(),
  stockable: z.boolean().nullable().optional(),
  serial_generation: z.string().max(120).nullable().optional(),
  lot_control: z.string().max(60).nullable().optional(),

  // Costing
  costing_enabled: z.boolean().nullable().optional(),
  inventory_asset_value: z.boolean().nullable().optional(),
  including_in_rollup: z.boolean().nullable().optional(),
  cost_of_goods_sold_account: z.string().max(120).nullable().optional(),

  // Purchasing
  purchased: z.boolean().nullable().optional(),
  purchasable: z.boolean().nullable().optional(),
  match_approval_level: z.string().max(30).nullable().optional(),
  invoice_match_option: z.string().max(30).nullable().optional(),
  receipt_required: z.boolean().nullable().optional(),
  inspection_required: z.boolean().nullable().optional(),
  input_tax_classification_code: z.string().max(60).nullable().optional(),
  expense_account: z.string().max(120).nullable().optional(),
  receipt_routing: z.string().max(30).nullable().optional(),

  // Receiving / Order Management
  customer_ordered: z.boolean().nullable().optional(),
  shippable_item: z.boolean().nullable().optional(),
  transfer_orders_enabled: z.boolean().nullable().optional(),
  order_management_transactable: z.boolean().nullable().optional(),
  returnable: z.boolean().nullable().optional(),

  // Invoicing
  invoiceable_item: z.boolean().nullable().optional(),
  invoice_enabled: z.boolean().nullable().optional(),
  sales_account: z.string().max(120).nullable().optional(),
  output_tax_classification_code: z.string().max(60).nullable().optional(),

  // Item Categories (Catalogs)
  inventory_catalog: z.string().max(60).nullable().optional(),
  inventory_catalog_name: z.string().max(120).nullable().optional(),
  inventory_catalog_code: z.string().max(60).nullable().optional(),
  inventory_catalog_description: z.string().nullable().optional(),

  tax_catalog: z.string().max(60).nullable().optional(),
  tax_catalog_name: z.string().max(120).nullable().optional(),
  tax_catalog_code: z.string().max(60).nullable().optional(),
  tax_catalog_description: z.string().nullable().optional(),

  purchasing_catalog: z.string().max(60).nullable().optional(),
  purchasing_catalog_name: z.string().max(120).nullable().optional(),
  purchasing_catalog_code: z.string().max(60).nullable().optional(),
  purchasing_catalog_description: z.string().nullable().optional(),

  // Purchasing Category Hierarchy Details
  l1_description: z.string().nullable().optional(),
  l2_description: z.string().nullable().optional(),
  l3_description: z.string().nullable().optional(),
  l4_description: z.string().nullable().optional(),
  l5_description: z.string().nullable().optional(),

  // Audit
  created_by: z.string().max(200).nullable().optional(),
  creation_date: z.string().nullable().optional(),
  last_update_by: z.string().max(120).nullable().optional(),
  last_update_date: z.string().nullable().optional(),

  // Agreement
  bpa_cpa_item: z.boolean().nullable().optional(),
});

// POST /items
const createItemSchema = z.object({
  body: baseItemBodySchema.extend({
    item: z.number().int(),
  }),
});

// PUT /items/:item
const updateItemSchema = z.object({
  params: z.object({
    item: z.string(),
  }),
  body: baseItemBodySchema.omit({ item: true }),
});

// GET /items/:item
const getItemByIdSchema = z.object({
  params: z.object({
    item: z.string(),
  }),
});

// GET /items
const listItemsQuerySchema = z.object({
  query: z.object({
    inventory_organization: z.string().max(30).optional(),
    item_status: z.string().max(30).optional(),
    primary_uom_code: z.string().max(10).optional(),
    user_item_type: z.string().max(50).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

// DELETE /items/:item
const deleteItemSchema = z.object({
  params: z.object({
    item: z.string(),
  }),
});

export const ItemsValidation = {
  createItemSchema,
  updateItemSchema,
  getItemByIdSchema,
  listItemsQuerySchema,
  deleteItemSchema,
};

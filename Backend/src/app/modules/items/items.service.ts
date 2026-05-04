import pool from '../../../utils/dbClient';
import { IItem, ICreateItemRequest, IUpdateItemRequest } from './items.interface';

const createItem = async (payload: ICreateItemRequest): Promise<IItem> => {
  const query = `
    INSERT INTO erp_item_master (
      item, description,
      inventory_organization, primary_uom_name, primary_uom_code, item_status,
      user_item_type, item_class, inventory_item, stockable, serial_generation, lot_control,
      costing_enabled, inventory_asset_value, including_in_rollup, cost_of_goods_sold_account,
      purchased, purchasable, match_approval_level, invoice_match_option,
      receipt_required, inspection_required, input_tax_classification_code, expense_account, receipt_routing,
      customer_ordered, shippable_item, transfer_orders_enabled, order_management_transactable, returnable,
      invoiceable_item, invoice_enabled, sales_account, output_tax_classification_code,
      inventory_catalog, inventory_catalog_name, inventory_catalog_code, inventory_catalog_description,
      tax_catalog, tax_catalog_name, tax_catalog_code, tax_catalog_description,
      purchasing_catalog, purchasing_catalog_name, purchasing_catalog_code, purchasing_catalog_description,
      l1_description, l2_description, l3_description, l4_description, l5_description,
      created_by, creation_date, last_update_by, last_update_date, bpa_cpa_item
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46,
      $47, $48, $49, $50, $51, $52, $53, $54, $55, $56
    )
    RETURNING *;
  `;

  const values = [
    payload.item,
    payload.description ?? null,
    payload.inventory_organization ?? null,
    payload.primary_uom_name ?? null,
    payload.primary_uom_code ?? null,
    payload.item_status ?? null,
    payload.user_item_type ?? null,
    payload.item_class ?? null,
    payload.inventory_item ?? null,
    payload.stockable ?? null,
    payload.serial_generation ?? null,
    payload.lot_control ?? null,
    payload.costing_enabled ?? null,
    payload.inventory_asset_value ?? null,
    payload.including_in_rollup ?? null,
    payload.cost_of_goods_sold_account ?? null,
    payload.purchased ?? null,
    payload.purchasable ?? null,
    payload.match_approval_level ?? null,
    payload.invoice_match_option ?? null,
    payload.receipt_required ?? null,
    payload.inspection_required ?? null,
    payload.input_tax_classification_code ?? null,
    payload.expense_account ?? null,
    payload.receipt_routing ?? null,
    payload.customer_ordered ?? null,
    payload.shippable_item ?? null,
    payload.transfer_orders_enabled ?? null,
    payload.order_management_transactable ?? null,
    payload.returnable ?? null,
    payload.invoiceable_item ?? null,
    payload.invoice_enabled ?? null,
    payload.sales_account ?? null,
    payload.output_tax_classification_code ?? null,
    payload.inventory_catalog ?? null,
    payload.inventory_catalog_name ?? null,
    payload.inventory_catalog_code ?? null,
    payload.inventory_catalog_description ?? null,
    payload.tax_catalog ?? null,
    payload.tax_catalog_name ?? null,
    payload.tax_catalog_code ?? null,
    payload.tax_catalog_description ?? null,
    payload.purchasing_catalog ?? null,
    payload.purchasing_catalog_name ?? null,
    payload.purchasing_catalog_code ?? null,
    payload.purchasing_catalog_description ?? null,
    payload.l1_description ?? null,
    payload.l2_description ?? null,
    payload.l3_description ?? null,
    payload.l4_description ?? null,
    payload.l5_description ?? null,
    payload.created_by ?? null,
    payload.creation_date ?? new Date().toISOString(),
    payload.last_update_by ?? null,
    payload.last_update_date ?? new Date().toISOString(),
    payload.bpa_cpa_item ?? null,
  ];

  const result = await pool.query<IItem>(query, values);
  return result.rows[0];
};

const updateItem = async (
  item: number,
  updates: IUpdateItemRequest
): Promise<IItem | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectQuery = 'SELECT * FROM erp_item_master WHERE item = $1';
    const selectResult = await pool.query<IItem>(selectQuery, [item]);
    return selectResult.rows[0] || null;
  }

  // Add last_update_date automatically
  const updateFields = { ...updates, last_update_date: new Date().toISOString() };
  const allFields = Object.keys(updateFields);

  const setClauses = allFields.map((field, index) => `${field} = $${index + 2}`);
  const values = [
    item,
    ...allFields.map(field => (updateFields as any)[field]),
  ];

  const query = `
    UPDATE erp_item_master
    SET ${setClauses.join(', ')}
    WHERE item = $1
    RETURNING *;
  `;

  const result = await pool.query<IItem>(query, values);
  return result.rows[0] || null;
};

const getItemById = async (item: number): Promise<IItem | null> => {
  const query = 'SELECT * FROM erp_item_master WHERE item = $1';
  const result = await pool.query<IItem>(query, [item]);
  return result.rows[0] || null;
};

const listItems = async (filters: {
  inventory_organization?: string;
  item_status?: string;
  primary_uom_code?: string;
  user_item_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: IItem[]; total: number }> => {
  const {
    inventory_organization,
    item_status,
    primary_uom_code,
    user_item_type,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions: string[] = [];
  const values: any[] = [];

  if (inventory_organization) {
    values.push(inventory_organization);
    conditions.push(`inventory_organization = $${values.length}`);
  }

  if (item_status) {
    values.push(item_status);
    conditions.push(`item_status = $${values.length}`);
  }

  if (primary_uom_code) {
    values.push(primary_uom_code);
    conditions.push(`primary_uom_code = $${values.length}`);
  }

  if (user_item_type) {
    values.push(user_item_type);
    conditions.push(`user_item_type = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT *
    FROM erp_item_master
    ${whereClause}
    ORDER BY creation_date DESC NULLS LAST, item DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM erp_item_master
    ${whereClause};
  `;

  const dataValues = [
    ...values,
    limit,
    offset,
  ];

  const [dataResult, countResult] = await Promise.all([
    pool.query<IItem>(dataQuery, dataValues),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const deleteItem = async (item: number): Promise<void> => {
  await pool.query('DELETE FROM erp_item_master WHERE item = $1', [item]);
};

export const ItemsService = {
  createItem,
  updateItem,
  getItemById,
  listItems,
  deleteItem,
};

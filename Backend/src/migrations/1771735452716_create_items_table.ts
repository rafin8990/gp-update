import pool from '../utils/dbClient';

export const name = '1771735452716_create_items_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE erp_item_master (
  item                         bigint PRIMARY KEY,
  description                  text,

  -- Inventory
  inventory_organization       varchar(30),
  primary_uom_name             varchar(50),
  primary_uom_code             varchar(10),
  item_status                  varchar(30),
  user_item_type               varchar(50),
  item_class                   varchar(100),

  inventory_item               boolean,
  stockable                    boolean,
  serial_generation            varchar(120),
  lot_control                  varchar(60),

  -- Costing
  costing_enabled              boolean,
  inventory_asset_value        boolean,
  including_in_rollup          boolean,
  cost_of_goods_sold_account   varchar(120),

  -- Purchasing
  purchased                    boolean,
  purchasable                  boolean,
  match_approval_level         varchar(30),
  invoice_match_option         varchar(30),
  receipt_required             boolean,
  inspection_required          boolean,
  input_tax_classification_code varchar(60),
  expense_account              varchar(120),
  receipt_routing              varchar(30),

  -- Receiving / Order Management
  customer_ordered             boolean,
  shippable_item               boolean,
  transfer_orders_enabled      boolean,
  order_management_transactable boolean,
  returnable                   boolean,

  -- Invoicing
  invoiceable_item             boolean,
  invoice_enabled              boolean,
  sales_account                varchar(120),
  output_tax_classification_code varchar(60),

  -- Item Categories (Catalogs)
  inventory_catalog            varchar(60),
  inventory_catalog_name       varchar(120),
  inventory_catalog_code       varchar(60),
  inventory_catalog_description text,

  tax_catalog                  varchar(60),
  tax_catalog_name             varchar(120),
  tax_catalog_code             varchar(60),
  tax_catalog_description      text,

  purchasing_catalog           varchar(60),
  purchasing_catalog_name      varchar(120),
  purchasing_catalog_code      varchar(60),
  purchasing_catalog_description text,

  -- Purchasing Category Hierarchy Details
  l1_description               text,
  l2_description               text,
  l3_description               text,
  l4_description               text,
  l5_description               text,

  -- Audit
  created_by                   varchar(200),
  creation_date                timestamptz,
  last_update_by               varchar(120),
  last_update_date             timestamptz,

  -- Agreement
  bpa_cpa_item                 boolean
);

-- Helpful indexes (optional)
CREATE INDEX idx_item_org  ON erp_item_master (inventory_organization);
CREATE INDEX idx_item_status ON erp_item_master (item_status);
CREATE INDEX idx_item_uom_code ON erp_item_master (primary_uom_code);
  `);
};
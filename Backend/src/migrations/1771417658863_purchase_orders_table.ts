import pool from '../utils/dbClient';

export const name = '1771417658863_purchase_orders_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      po_header_id        BIGINT PRIMARY KEY,            
      po_number           VARCHAR(30) NOT NULL UNIQUE,   

      status_code         VARCHAR(20) NOT NULL,
      status_name         VARCHAR(50),
      order_status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (order_status IN ('pending', 'partially_received', 'full_received')),

      procurement_bu_id   BIGINT,
      procurement_bu_name VARCHAR(200),

      supplier_id         BIGINT,
      supplier_name       VARCHAR(200),
      supplier_site_id    BIGINT,
      supplier_site_code  VARCHAR(50),

      buyer_id            BIGINT,
      buyer_name          VARCHAR(200),

      ship_to_location_id   BIGINT,
      ship_to_location_code VARCHAR(100),
      ship_to_address        TEXT,

      currency_code       VARCHAR(10),
      ordered_amount      NUMERIC(18,2),
      tax_amount          NUMERIC(18,2),
      total_amount        NUMERIC(18,2),

      order_date          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),

      source_system       VARCHAR(50) DEFAULT 'oracle_fusion',
      raw_payload         JSONB,

      inserted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      synced_at           TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
      ON purchase_orders(status_code);

    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
      ON purchase_orders(supplier_id);
  `);
};
import pool from '../utils/dbClient';

export const name = '1771417897759_purchase_order_line_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_order_lines (
      po_line_id        BIGINT PRIMARY KEY,
      po_header_id      BIGINT NOT NULL REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,

      line_number       INT NOT NULL,
      line_status_code  VARCHAR(20) NOT NULL,
      line_status_name  VARCHAR(50),
      line_type         VARCHAR(50),

      item_id           BIGINT,
      item_code         VARCHAR(100),
      item_description  TEXT,
      category_code     VARCHAR(100),

      uom_code          VARCHAR(20),
      uom_name          VARCHAR(50),

      quantity          NUMERIC(18,4),
      unit_price        NUMERIC(18,4),
      currency_code     VARCHAR(10),

      line_amount       NUMERIC(18,2),
      tax_amount        NUMERIC(18,2),
      total_amount      NUMERIC(18,2),

      serial_start      VARCHAR(255),
      serial_end        VARCHAR(255),

      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW(),

      raw_payload        JSONB,

      inserted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      synced_at          TIMESTAMPTZ,

      UNIQUE (po_header_id, line_number)
    );

    CREATE INDEX IF NOT EXISTS idx_po_lines_header
      ON purchase_order_lines(po_header_id);

    CREATE INDEX IF NOT EXISTS idx_po_lines_item
      ON purchase_order_lines(item_code);

    CREATE INDEX IF NOT EXISTS idx_po_lines_status
      ON purchase_order_lines(line_status_code);
  `);
};
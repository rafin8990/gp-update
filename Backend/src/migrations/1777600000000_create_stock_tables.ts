import pool from '../utils/dbClient';

export const name = '1777600000000_create_stock_tables';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock (
      id                  BIGSERIAL PRIMARY KEY,
      po_lot_detail_id    INTEGER NOT NULL REFERENCES po_lot_details(id) ON DELETE CASCADE,
      po_header_id        BIGINT NOT NULL REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,
      item_id             BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      lot_number          VARCHAR(100) NOT NULL,
      quantity            NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (po_lot_detail_id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_po_header ON stock(po_header_id);
    CREATE INDEX IF NOT EXISTS idx_stock_item ON stock(item_id);

    CREATE TABLE IF NOT EXISTS stock_lot_approvals (
      id                  BIGSERIAL PRIMARY KEY,
      po_lot_detail_id    INTEGER NOT NULL REFERENCES po_lot_details(id) ON DELETE CASCADE,
      po_header_id        BIGINT NOT NULL REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,
      item_id             BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      lot_number          VARCHAR(100) NOT NULL,
      quantity_posted     NUMERIC(18, 4) NOT NULL CHECK (quantity_posted >= 0),
      approved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (po_lot_detail_id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_lot_approvals_po ON stock_lot_approvals(po_header_id);
  `);
};

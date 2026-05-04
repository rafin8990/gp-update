import pool from '../utils/dbClient';

export const name = '1777290414997_create_po_transaction_receipt_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS po_transaction_receipt (
      id                        SERIAL PRIMARY KEY,
      po_header_id              BIGINT NOT NULL,
      interface_line_number     VARCHAR(30) NOT NULL UNIQUE,
      transaction_type          VARCHAR(100) NOT NULL DEFAULT 'deliver',
      transaction_date          TIMESTAMPTZ NULL,
      source_document_code      VARCHAR(50) NULL DEFAULT 'PO',
      receipt_source_code       VARCHAR(50) NULL DEFAULT 'Vendor',
      header_interface_number   VARCHAR(30) NULL,
      parent_transaction_id     VARCHAR(30) NULL,
      organization_code         VARCHAR(100) NULL,
      document_number           VARCHAR(100) NULL,
      document_line_number      VARCHAR(100) NULL DEFAULT '1',
      document_schedule_number  VARCHAR(100) NULL DEFAULT '1',
      business_unit             VARCHAR(100) NULL DEFAULT 'Grameenphone Ltd.',
      sub_inventory             VARCHAR(100) NULL DEFAULT 'prod',
      uom                       VARCHAR(80) NULL,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_ptr_po_header
        FOREIGN KEY (po_header_id) REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS po_lot_details (
      id                        SERIAL PRIMARY KEY,
      po_header_id              BIGINT NOT NULL,
      interface_line_number     VARCHAR(30) NOT NULL,
      item_number               BIGINT NOT NULL,
      lot_number                VARCHAR(100) NOT NULL,
      transaction_quantity      NUMERIC NOT NULL,
      expired_date              TIMESTAMPTZ NULL,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_pld_po_header
        FOREIGN KEY (po_header_id) REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,
      CONSTRAINT fk_pld_interface_line_number
        FOREIGN KEY (interface_line_number) REFERENCES po_transaction_receipt(interface_line_number) ON DELETE CASCADE,
      CONSTRAINT fk_pld_item_number
        FOREIGN KEY (item_number) REFERENCES erp_item_master(item) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ptr_po_header_id
      ON po_transaction_receipt(po_header_id);

    CREATE INDEX IF NOT EXISTS idx_ptr_interface_line_number
      ON po_transaction_receipt(interface_line_number);

    CREATE INDEX IF NOT EXISTS idx_pld_po_header_id
      ON po_lot_details(po_header_id);

    CREATE INDEX IF NOT EXISTS idx_pld_interface_line_number
      ON po_lot_details(interface_line_number);

    CREATE INDEX IF NOT EXISTS idx_pld_item_number
      ON po_lot_details(item_number);
  `);
};
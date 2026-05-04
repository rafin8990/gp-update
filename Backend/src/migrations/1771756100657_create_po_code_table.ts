import pool from '../utils/dbClient';

export const name = '1771756100657_create_po_code_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS po_codes (
      id                SERIAL PRIMARY KEY,
      po_header_id     BIGINT NOT NULL,
      item_id          BIGINT NOT NULL,
      rfid_code        VARCHAR(255) NOT NULL UNIQUE,
      serial_start     BIGINT,
      serial_end       BIGINT,
      quantity         BIGINT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW(),
      
      CONSTRAINT fk_po_header FOREIGN KEY (po_header_id) 
        REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,
      CONSTRAINT fk_item FOREIGN KEY (item_id) 
        REFERENCES erp_item_master(item) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_po_codes_po_header 
      ON po_codes(po_header_id);
    
    CREATE INDEX IF NOT EXISTS idx_po_codes_item 
      ON po_codes(item_id);
    
    CREATE INDEX IF NOT EXISTS idx_po_codes_rfid 
      ON po_codes(rfid_code);
  `);
};

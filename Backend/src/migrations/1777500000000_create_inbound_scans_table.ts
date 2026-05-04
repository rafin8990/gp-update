import pool from '../utils/dbClient';

export const name = '1777500000000_create_inbound_scans_table';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inbound_scans (
      id              BIGSERIAL PRIMARY KEY,
      epc             VARCHAR(255) NOT NULL,
      po_code_id      BIGINT NOT NULL REFERENCES po_codes(id) ON DELETE CASCADE,
      po_header_id    BIGINT NOT NULL REFERENCES purchase_orders(po_header_id) ON DELETE CASCADE,
      item_id         BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      location_id     INT REFERENCES locations(id) ON DELETE SET NULL,
      status          VARCHAR(8) NOT NULL CHECK (status IN ('in', 'out')),
      rssi            VARCHAR(20),
      device_id       VARCHAR(120),
      quantity        BIGINT,
      serial_start    BIGINT,
      serial_end      BIGINT,
      scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_inbound_scans_epc
      ON inbound_scans(epc);

    CREATE INDEX IF NOT EXISTS idx_inbound_scans_po_header
      ON inbound_scans(po_header_id);

    CREATE INDEX IF NOT EXISTS idx_inbound_scans_location
      ON inbound_scans(location_id);

    CREATE INDEX IF NOT EXISTS idx_inbound_scans_scanned_at
      ON inbound_scans(scanned_at DESC);

    CREATE INDEX IF NOT EXISTS idx_inbound_scans_epc_time
      ON inbound_scans(epc, scanned_at DESC);
  `);
};

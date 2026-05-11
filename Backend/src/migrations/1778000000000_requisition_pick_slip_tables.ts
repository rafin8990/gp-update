import pool from '../utils/dbClient';

export const name = '1778000000000_requisition_pick_slip_tables';

export const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requisitions (
      id                        SERIAL PRIMARY KEY,
      requisition_number        VARCHAR(120) NOT NULL,
      source_order              VARCHAR(200),
      distribution_partner_name TEXT NOT NULL DEFAULT '',
      address                   TEXT NOT NULL DEFAULT '',
      organization_code         VARCHAR(80) NOT NULL DEFAULT '',
      description               TEXT,
      status                    VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'complete', 'cancel', 'received')),
      transport_type_1        VARCHAR(120),
      transport_type_2        VARCHAR(120),
      vehicle_1                 VARCHAR(120),
      vehicle_2                 VARCHAR(120),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (requisition_number)
    );

    CREATE TABLE IF NOT EXISTS requisition_lines (
      id                        SERIAL PRIMARY KEY,
      requisition_id            INT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
      item_id                   BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      item_type                 VARCHAR(80),
      requested_quantity        NUMERIC(18, 4) NOT NULL DEFAULT 0,
      source_subinventory       VARCHAR(120),
      source_location_code      VARCHAR(120),
      uom                       VARCHAR(40),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_requisition_lines_req ON requisition_lines(requisition_id);
    CREATE INDEX IF NOT EXISTS idx_requisition_lines_item ON requisition_lines(item_id);

    CREATE TABLE IF NOT EXISTS pick_slips (
      id                        SERIAL PRIMARY KEY,
      pick_slip_number          VARCHAR(80) NOT NULL,
      requisition_id            INT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
      status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'released', 'completed', 'cancelled')),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (pick_slip_number)
    );

    CREATE INDEX IF NOT EXISTS idx_pick_slips_requisition ON pick_slips(requisition_id);
    CREATE INDEX IF NOT EXISTS idx_pick_slips_status ON pick_slips(status);

    CREATE TABLE IF NOT EXISTS pick_slip_lines (
      id                        SERIAL PRIMARY KEY,
      pick_slip_id              INT NOT NULL REFERENCES pick_slips(id) ON DELETE CASCADE,
      requisition_line_id       INT REFERENCES requisition_lines(id) ON DELETE SET NULL,
      item_id                   BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      lot_number                VARCHAR(100) NOT NULL DEFAULT '',
      picked_quantity           NUMERIC(18, 4) NOT NULL DEFAULT 0,
      source_subinventory       VARCHAR(120),
      source_location_code      VARCHAR(120),
      from_serial               TEXT,
      to_serial                 TEXT,
      lot_from_serial           TEXT,
      lot_to_serial             TEXT,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pick_slip_lines_slip ON pick_slip_lines(pick_slip_id);

    CREATE TABLE IF NOT EXISTS pick_slip_epcs (
      id                        SERIAL PRIMARY KEY,
      pick_slip_id              INT NOT NULL REFERENCES pick_slips(id) ON DELETE CASCADE,
      pick_slip_line_id         INT REFERENCES pick_slip_lines(id) ON DELETE SET NULL,
      item_id                   BIGINT NOT NULL REFERENCES erp_item_master(item) ON DELETE CASCADE,
      epc                       VARCHAR(255) NOT NULL,
      lot_number                VARCHAR(100) NOT NULL DEFAULT '',
      serial_snapshot           TEXT,
      stock_po_number           VARCHAR(80),
      stock_lot_number          VARCHAR(100),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (pick_slip_id, epc)
    );

    CREATE INDEX IF NOT EXISTS idx_pick_slip_epcs_epc ON pick_slip_epcs(epc);
  `);
};

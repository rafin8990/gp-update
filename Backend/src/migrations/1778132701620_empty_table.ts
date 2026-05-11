import pool from '../utils/dbClient';

export const name = '1778132701620B_empty_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    TRUNCATE TABLE
      stock,
      po_lot_details,
      po_transaction_receipt,
      inbound_scans,
      stock_lot_approvals,
      pick_slips,
      pick_slip_lines,
      pick_slip_epcs
    RESTART IDENTITY CASCADE;
  `);
};
/* eslint-disable @typescript-eslint/no-explicit-any */
import pool from '../../../utils/dbClient';
import {
  IAggregatedStock,
  ILiveStockData,
  IStockListFilters,
  IStockRow,
  IStockStats,
  IStockSummary,
} from './stock.interface';

const baseStockSelect = `
  SELECT
    s.id,
    po.po_number,
    s.item_id::text AS item_number,
    COALESCE(im.description, '') AS item_description,
    s.lot_number AS lot_no,
    s.quantity::float8 AS quantity,
    s.created_at,
    s.updated_at,
    po.order_date AS po_date,
    loc_last.last_location_status,
    loc_last.last_location_time,
    loc_last.last_location_name
  FROM stock s
  JOIN purchase_orders po ON po.po_header_id = s.po_header_id
  JOIN erp_item_master im ON im.item = s.item_id
  LEFT JOIN LATERAL (
    SELECT
      scan.status AS last_location_status,
      scan.scanned_at AS last_location_time,
      loc.name AS last_location_name
    FROM inbound_scans scan
    LEFT JOIN locations loc ON loc.id = scan.location_id
    WHERE scan.po_header_id = s.po_header_id
      AND scan.item_id = s.item_id
    ORDER BY scan.scanned_at DESC NULLS LAST, scan.id DESC
    LIMIT 1
  ) loc_last ON true
`;

const mapStockRow = (row: any): IStockRow => ({
  id: Number(row.id),
  po_number: row.po_number,
  item_number: row.item_number,
  lot_no: row.lot_no,
  quantity: Number(row.quantity ?? 0),
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
  item_description: row.item_description ?? undefined,
  po_date: row.po_date ? new Date(row.po_date).toISOString() : undefined,
  last_location_status: row.last_location_status ?? undefined,
  last_location_time: row.last_location_time
    ? new Date(row.last_location_time).toISOString()
    : undefined,
  last_location_name: row.last_location_name ?? undefined,
});

const listStocks = async (filters: IStockListFilters = {}): Promise<IStockRow[]> => {
  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.po_number) {
    values.push(`%${filters.po_number}%`);
    conditions.push(`po.po_number ILIKE $${values.length}`);
  }
  if (filters.item_number) {
    values.push(`%${filters.item_number}%`);
    conditions.push(`s.item_id::text ILIKE $${values.length}`);
  }
  if (filters.lot_no) {
    values.push(`%${filters.lot_no}%`);
    conditions.push(`s.lot_number ILIKE $${values.length}`);
  }
  if (filters.searchTerm) {
    values.push(`%${filters.searchTerm}%`);
    const idx = values.length;
    conditions.push(
      `(po.po_number ILIKE $${idx} OR s.item_id::text ILIKE $${idx} OR s.lot_number ILIKE $${idx} OR im.description ILIKE $${idx})`,
    );
  }

  const where = conditions.join(' AND ');
  const result = await pool.query(
    `
      ${baseStockSelect}
      WHERE ${where}
      ORDER BY po.po_number ASC, s.lot_number ASC, s.item_id ASC
    `,
    values,
  );

  return result.rows.map(mapStockRow);
};

const getStockStats = async (): Promise<IStockStats> => {
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total_items,
        COALESCE(SUM(quantity), 0)::float8 AS total_quantity,
        COUNT(DISTINCT item_id)::int AS unique_items,
        COUNT(DISTINCT po_header_id)::int AS unique_pos,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '1 hour')::int AS recent_updates
      FROM stock
    `,
  );

  const row = result.rows[0];
  return {
    total_items: Number(row.total_items ?? 0),
    total_quantity: Number(row.total_quantity ?? 0),
    unique_items: Number(row.unique_items ?? 0),
    unique_pos: Number(row.unique_pos ?? 0),
    recent_updates: Number(row.recent_updates ?? 0),
  };
};

const getStockSummary = async (): Promise<IStockSummary[]> => {
  const result = await pool.query(
    `
      SELECT
        s.item_id::text AS item_number,
        COALESCE(MAX(im.description), '') AS item_description,
        SUM(s.quantity)::float8 AS total_quantity,
        COUNT(DISTINCT s.lot_number)::int AS lot_count,
        COUNT(DISTINCT s.po_header_id)::int AS po_count,
        MAX(s.updated_at) AS last_updated
      FROM stock s
      JOIN erp_item_master im ON im.item = s.item_id
      GROUP BY s.item_id
      ORDER BY s.item_id ASC
    `,
  );

  return result.rows.map(r => ({
    item_number: r.item_number,
    item_description: r.item_description,
    total_quantity: Number(r.total_quantity ?? 0),
    lot_count: Number(r.lot_count ?? 0),
    po_count: Number(r.po_count ?? 0),
    last_updated: new Date(r.last_updated).toISOString(),
  }));
};

const getLiveStockData = async (): Promise<ILiveStockData> => {
  const [stats, summary] = await Promise.all([getStockStats(), getStockSummary()]);
  return {
    stats,
    summary,
    last_updated: new Date().toISOString(),
  };
};

const getAggregatedStocks = async (): Promise<IAggregatedStock[]> => {
  const result = await pool.query(
    `
      SELECT
        s.item_id::text AS item_number,
        COALESCE(MAX(im.description), '') AS item_description,
        s.lot_number AS lot_no,
        SUM(s.quantity)::float8 AS total_quantity,
        0::int AS epc_count,
        COUNT(DISTINCT s.po_header_id)::int AS po_count,
        MAX(s.updated_at) AS last_updated
      FROM stock s
      JOIN erp_item_master im ON im.item = s.item_id
      GROUP BY s.item_id, s.lot_number
      ORDER BY s.item_id ASC, s.lot_number ASC
    `,
  );

  return result.rows.map(r => ({
    item_number: r.item_number,
    item_description: r.item_description,
    lot_no: r.lot_no,
    total_quantity: Number(r.total_quantity ?? 0),
    epc_count: Number(r.epc_count ?? 0),
    po_count: Number(r.po_count ?? 0),
    last_updated: new Date(r.last_updated).toISOString(),
  }));
};

const getStockByPoItemLot = async (
  poNumber: string,
  itemNumber: string,
  lotNo: string,
): Promise<IStockRow | null> => {
  const result = await pool.query(
    `
      ${baseStockSelect}
      WHERE po.po_number = $1
        AND s.item_id::text = $2
        AND s.lot_number = $3
      LIMIT 1
    `,
    [poNumber, itemNumber, lotNo],
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapStockRow(result.rows[0]);
};

export const StockService = {
  listStocks,
  getStockStats,
  getStockSummary,
  getLiveStockData,
  getAggregatedStocks,
  getStockByPoItemLot,
};

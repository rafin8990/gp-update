/* eslint-disable @typescript-eslint/no-explicit-any */
import pool from '../../../utils/dbClient';
import {
  IListFilters,
  IListResponse,
  ILocationStatusRow,
  ILocationTrackerRow,
  ILocationTrackerStats,
} from './locationTrackers.interface';

const SCAN_SELECT_BASE = `
  SELECT
    s.id,
    COALESCE(loc.location_code, '') AS location_code,
    loc.name AS location_name,
    po.po_number,
    s.item_id::text AS item_number,
    COALESCE(im.description, '') AS item_description,
    COALESCE(s.quantity, 0)::float8 AS quantity,
    s.status,
    s.epc,
    s.scanned_at AS created_at,
    s.scanned_at AS updated_at
  FROM inbound_scans s
  LEFT JOIN locations loc ON loc.id = s.location_id
  JOIN purchase_orders po ON po.po_header_id = s.po_header_id
  JOIN erp_item_master im ON im.item = s.item_id
`;

const mapRow = (row: any): ILocationTrackerRow => ({
  id: Number(row.id),
  location_code: row.location_code ?? '',
  location_name: row.location_name ?? null,
  po_number: row.po_number,
  item_number: row.item_number,
  item_description: row.item_description || null,
  quantity: Number(row.quantity ?? 0),
  status: row.status,
  epc: row.epc,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
});

const listFromInboundScans = async (filters: IListFilters): Promise<IListResponse> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }
  if (filters.location_code) {
    values.push(`%${filters.location_code}%`);
    conditions.push(`COALESCE(loc.location_code, '') ILIKE $${values.length}`);
  }
  if (filters.po_number) {
    values.push(`%${filters.po_number}%`);
    conditions.push(`po.po_number ILIKE $${values.length}`);
  }
  if (filters.item_number) {
    values.push(`%${filters.item_number}%`);
    conditions.push(`s.item_id::text ILIKE $${values.length}`);
  }
  if (filters.epc) {
    values.push(`%${filters.epc}%`);
    conditions.push(`s.epc ILIKE $${values.length}`);
  }
  if (filters.start_date) {
    values.push(filters.start_date);
    conditions.push(`s.scanned_at >= $${values.length}::timestamptz`);
  }
  if (filters.end_date) {
    values.push(filters.end_date);
    conditions.push(`s.scanned_at <= $${values.length}::timestamptz`);
  }
  if (filters.searchTerm) {
    values.push(`%${filters.searchTerm}%`);
    const idx = values.length;
    conditions.push(
      `(s.epc ILIKE $${idx} OR s.item_id::text ILIKE $${idx} OR po.po_number ILIKE $${idx} OR COALESCE(loc.location_code, '') ILIKE $${idx} OR im.description ILIKE $${idx})`,
    );
  }

  const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM inbound_scans s
      LEFT JOIN locations loc ON loc.id = s.location_id
      JOIN purchase_orders po ON po.po_header_id = s.po_header_id
      JOIN erp_item_master im ON im.item = s.item_id
      WHERE ${whereClause}
    `,
    values,
  );

  const total = Number(countResult.rows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;

  const limPlaceholder = values.length + 1;
  const offPlaceholder = values.length + 2;

  const dataResult = await pool.query(
    `
      ${SCAN_SELECT_BASE}
      WHERE ${whereClause}
      ORDER BY s.scanned_at ${sortOrder} NULLS LAST, s.id ${sortOrder}
      LIMIT $${limPlaceholder} OFFSET $${offPlaceholder}
    `,
    [...values, limit, offset],
  );

  return {
    data: dataResult.rows.map(mapRow),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

const listByLocationCode = async (locationCode: string): Promise<ILocationTrackerRow[]> => {
  const result = await pool.query(
    `
      ${SCAN_SELECT_BASE}
      WHERE COALESCE(loc.location_code, '') = $1
      ORDER BY s.scanned_at DESC NULLS LAST, s.id DESC
      LIMIT 500
    `,
    [locationCode],
  );
  return result.rows.map(mapRow);
};

const getStats = async (): Promise<ILocationTrackerStats> => {
  const totalResult = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM inbound_scans`,
  );

  const latestPerEpc = await pool.query<{ status: string }>(
    `
      SELECT status
      FROM (
        SELECT DISTINCT ON (epc)
          epc,
          status
        FROM inbound_scans
        ORDER BY epc, scanned_at DESC NULLS LAST, id DESC
      ) sub
    `,
  );

  let current_in = 0;
  let current_out = 0;
  for (const row of latestPerEpc.rows) {
    if (row.status === 'in') current_in += 1;
    else current_out += 1;
  }

  const recentResult = await pool.query<{ c: string }>(
    `
      SELECT COUNT(*)::text AS c
      FROM inbound_scans
      WHERE scanned_at >= NOW() - INTERVAL '1 hour'
    `,
  );

  return {
    total_trackers: Number(totalResult.rows[0]?.c ?? 0),
    current_in,
    current_out,
    recent_activity: Number(recentResult.rows[0]?.c ?? 0),
  };
};

const getCurrentStatus = async (): Promise<ILocationStatusRow[]> => {
  const result = await pool.query(
    `
      SELECT DISTINCT ON (s.epc)
        COALESCE(loc.location_code, '') AS location_code,
        loc.name AS location_name,
        po.po_number,
        s.item_id::text AS item_number,
        s.status AS last_status,
        s.scanned_at AS last_updated,
        s.epc
      FROM inbound_scans s
      LEFT JOIN locations loc ON loc.id = s.location_id
      JOIN purchase_orders po ON po.po_header_id = s.po_header_id
      ORDER BY s.epc, s.scanned_at DESC NULLS LAST, s.id DESC
    `,
  );

  return result.rows.map((row: any) => ({
    location_code: row.location_code ?? '',
    location_name: row.location_name ?? null,
    po_number: row.po_number,
    item_number: row.item_number,
    last_status: row.last_status,
    last_updated: new Date(row.last_updated).toISOString(),
    epc: row.epc,
  }));
};

export const LocationTrackersService = {
  listFromInboundScans,
  listByLocationCode,
  getStats,
  getCurrentStatus,
};

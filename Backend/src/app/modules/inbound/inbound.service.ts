/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import redisClient from '../../../utils/redisClient';
import { io } from '../../../server';
import { PoolClient } from 'pg';
import {
  getInboundDedupKey,
  INBOUND_DEDUP_TTL_SEC,
  INBOUND_SOCKET_EVENT,
  OUTBOUND_INVALID_EPC_EVENT,
} from './inbound.constant';
import { isEpcOnReleasedPickSlip } from '../pickSlips/pickSlip.service';
import {
  IInboundItemSummary,
  IInboundListFilters,
  IInboundLiveItem,
  IInboundLookupRow,
  IInboundPoSummary,
  IInboundScan,
  IInboundScanResponse,
  IScanRequest,
} from './inbound.interface';

type IInboundListResponse = {
  data: IInboundScan[];
  total: number;
};

type IExportFilters = IInboundListFilters & {
  from?: string;
  to?: string;
};

const toSafeNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatTimestamp = (value?: string | number): string => {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return new Date(numericValue).toISOString();
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
};

const buildLookupQuery = `
  SELECT
    pc.id,
    pc.po_header_id,
    pc.item_id,
    pc.rfid_code,
    pc.serial_start::text AS serial_start,
    pc.serial_end::text AS serial_end,
    COALESCE(pc.quantity, 0)::bigint AS quantity,
    im.description AS item_description,
    po.po_number,
    loc.id AS location_id,
    loc.name AS location_name,
    loc.location_code,
    (
      SELECT COALESCE(SUM(pol.quantity), 0)
      FROM purchase_order_lines pol
      WHERE pol.po_header_id = pc.po_header_id
        AND pol.item_id = pc.item_id
    )::numeric AS ordered_quantity
  FROM po_codes pc
  JOIN erp_item_master im ON im.item = pc.item_id
  JOIN purchase_orders po ON po.po_header_id = pc.po_header_id
  LEFT JOIN locations loc ON loc.id = $2
  WHERE pc.rfid_code = $1
  LIMIT 1
`;

const getLookupByEpc = async (
  epc: string,
  locationId: number | null,
): Promise<IInboundLookupRow> => {
  const result = await pool.query<IInboundLookupRow>(buildLookupQuery, [epc, locationId]);

  if ((result.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unknown EPC: ${epc}`);
  }

  return result.rows[0];
};

const isDuplicateByDatabase = async (
  epc: string,
  locationId: number | null,
): Promise<boolean> => {
  const query = `
    SELECT 1
    FROM inbound_scans
    WHERE epc = $1
      AND location_id IS NOT DISTINCT FROM $2
      AND scanned_at >= NOW() - ($3 || ' seconds')::interval
    LIMIT 1
  `;

  const result = await pool.query(query, [epc, locationId, INBOUND_DEDUP_TTL_SEC]);
  return (result.rowCount ?? 0) > 0;
};

/**
 * Per EPC + reader location: first event at that location is `in`, then alternates `in` / `out`
 * based on the last row for the same EPC and same `location_id` (dedup still limits rapid repeats).
 */
const getNextStatus = async (epc: string, scanLocationId: number | null): Promise<'in' | 'out'> => {
  const result = await pool.query<{ status: 'in' | 'out' }>(
    `
      SELECT status
      FROM inbound_scans
      WHERE epc = $1
        AND location_id IS NOT DISTINCT FROM $2
      ORDER BY scanned_at DESC, id DESC
      LIMIT 1
    `,
    [epc, scanLocationId],
  );

  if ((result.rowCount ?? 0) === 0) {
    return 'in';
  }

  const last = result.rows[0];
  return last.status === 'in' ? 'out' : 'in';
};

const buildLivePayload = (
  row: IInboundLookupRow,
  status: 'in' | 'out',
  timestamp: string,
  scanId: number,
): IInboundLiveItem => ({
  id: scanId,
  scan_id: scanId,
  po_number: row.po_number,
  lot_no: row.location_code ?? undefined,
  item_number: String(row.item_id),
  item_description: row.item_description ?? null,
  ordered_quantity: row.ordered_quantity ? Number(row.ordered_quantity) : 0,
  quantity: Number(row.quantity ?? 0),
  epc: row.rfid_code,
  serial_start: row.serial_start ?? null,
  serial_end: row.serial_end ?? null,
  location_name: row.location_name ?? null,
  location_code: row.location_code ?? null,
  status,
  updated_at: timestamp,
  created_at: timestamp,
  timestamp,
});

/**
 * Decrement stock for outbound gate scan (location_id=1, status=out).
 * Uses FIFO across stock rows for this PO + item and never allows negative stock.
 */
const decrementStockForOutbound = async (
  client: PoolClient,
  poHeaderId: number,
  itemId: number,
  quantityToDecrement: number,
): Promise<void> => {
  const qty = Number(quantityToDecrement ?? 0);
  if (!(qty > 0)) {
    return;
  }

  const stockRows = await client.query<{ id: number; quantity: string }>(
    `
      SELECT id, quantity::text
      FROM stock
      WHERE po_header_id = $1
        AND item_id = $2
        AND quantity > 0
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    `,
    [poHeaderId, itemId],
  );

  const totalAvailable = stockRows.rows.reduce(
    (sum, row) => sum + Number(row.quantity ?? 0),
    0,
  );

  if (totalAvailable < qty) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient stock for outbound: required ${qty}, available ${totalAvailable}`,
    );
  }

  let remaining = qty;
  for (const row of stockRows.rows) {
    if (remaining <= 0) break;
    const rowQty = Number(row.quantity ?? 0);
    if (rowQty <= 0) continue;
    const deduct = Math.min(rowQty, remaining);
    await client.query(
      `
        UPDATE stock
        SET quantity = quantity - $2, updated_at = NOW()
        WHERE id = $1
      `,
      [row.id, deduct],
    );
    remaining -= deduct;
  }
};

const recordScan = async (payload: IScanRequest): Promise<IInboundScanResponse> => {
  const epc = payload.epc.trim();

  if (!epc) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'EPC is required');
  }

  const locationId = toSafeNumber(payload.value);
  const dedupKey = getInboundDedupKey(epc, locationId);

  if (await redisClient.exists(dedupKey)) {
    return { deduped: true };
  }

  if (await isDuplicateByDatabase(epc, locationId)) {
    return { deduped: true };
  }

  const lookup = await getLookupByEpc(epc, locationId);
  const status = await getNextStatus(epc, locationId);
  const scannedAt = formatTimestamp(payload.timestamp);

  /** Dock outbound gate: only when reader location id is exactly 1 and scan is OUT */
  if (status === 'out' && locationId === 1) {
    const allowed = await isEpcOnReleasedPickSlip(epc);
    if (!allowed) {
      if (io) {
        io.emit(OUTBOUND_INVALID_EPC_EVENT, {
          epc,
          location_id: locationId,
          timestamp: new Date().toISOString(),
        });
      }
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'EPC is not on a released pick slip — outbound blocked at this dock',
      );
    }
  }

  const client = await pool.connect();
  let insertResult;
  try {
    await client.query('BEGIN');

    insertResult = await client.query<IInboundScan>(
      `
        INSERT INTO inbound_scans (
          epc,
          po_code_id,
          po_header_id,
          item_id,
          location_id,
          status,
          rssi,
          device_id,
          quantity,
          serial_start,
          serial_end,
          scanned_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *
      `,
      [
        epc,
        lookup.id,
        lookup.po_header_id,
        lookup.item_id,
        lookup.location_id ?? null,
        status,
        payload.rssi !== undefined ? String(payload.rssi) : null,
        payload.deviceId ?? null,
        lookup.quantity ?? 0,
        lookup.serial_start ? Number(lookup.serial_start) : null,
        lookup.serial_end ? Number(lookup.serial_end) : null,
        scannedAt,
      ],
    );

    if (status === 'out' && locationId === 1) {
      await decrementStockForOutbound(
        client,
        Number(lookup.po_header_id),
        Number(lookup.item_id),
        Number(lookup.quantity ?? 0),
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await redisClient.set(dedupKey, String(insertResult.rows[0].id), INBOUND_DEDUP_TTL_SEC);

  const scanId = Number(insertResult.rows[0].id);
  const livePayload = buildLivePayload(lookup, status, scannedAt, scanId);

  if (io) {
    io.emit(INBOUND_SOCKET_EVENT, livePayload);
  }

  return {
    deduped: false,
    data: livePayload,
  };
};

const getLiveSummary = async (limit = 50): Promise<IInboundLiveItem[]> => {
  const result = await pool.query<IInboundLiveItem>(
    `
      SELECT DISTINCT ON (scan.epc)
        po.po_number,
        loc.location_code AS lot_no,
        loc.name AS location_name,
        loc.location_code,
        scan.item_id::text AS item_number,
        im.description AS item_description,
        (
          SELECT COALESCE(SUM(pol.quantity), 0)
          FROM purchase_order_lines pol
          WHERE pol.po_header_id = scan.po_header_id
            AND pol.item_id = scan.item_id
        )::numeric AS ordered_quantity,
        COALESCE(scan.quantity, 0)::bigint AS quantity,
        scan.epc,
        scan.serial_start::text AS serial_start,
        scan.serial_end::text AS serial_end,
        scan.status,
        scan.scanned_at AS updated_at
      FROM inbound_scans scan
      JOIN purchase_orders po ON po.po_header_id = scan.po_header_id
      JOIN erp_item_master im ON im.item = scan.item_id
      LEFT JOIN locations loc ON loc.id = scan.location_id
      ORDER BY scan.epc, scan.scanned_at DESC, scan.id DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(row => ({
    ...row,
    ordered_quantity: Number(row.ordered_quantity ?? 0),
    quantity: Number(row.quantity ?? 0),
  }));
};

const getItemWiseSummary = async (): Promise<IInboundItemSummary[]> => {
  const result = await pool.query<IInboundItemSummary>(
    `
      SELECT
        scan.item_id::text AS item_number,
        im.description AS item_description,
        (
          SELECT COALESCE(SUM(pol.quantity), 0)
          FROM purchase_order_lines pol
          WHERE pol.item_id = scan.item_id
        )::numeric AS order_total_quantity,
        COALESCE(
          SUM(
            CASE
              WHEN scan.status = 'in' THEN COALESCE(scan.quantity, 0)
              ELSE COALESCE(scan.quantity, 0) * -1
            END
          ),
          0
        )::bigint AS received_total_quantity,
        MIN(scan.serial_start)::text AS serial_start,
        MAX(scan.serial_end)::text AS serial_end
      FROM inbound_scans scan
      JOIN erp_item_master im ON im.item = scan.item_id
      GROUP BY scan.item_id, im.description
      ORDER BY scan.item_id ASC
    `,
  );

  return result.rows.map(row => ({
    ...row,
    order_total_quantity: Number(row.order_total_quantity ?? 0),
    received_total_quantity: Number(row.received_total_quantity ?? 0),
  }));
};

const getPoSummary = async (poHeaderId: number): Promise<IInboundPoSummary[]> => {
  const result = await pool.query<IInboundPoSummary>(
    `
      SELECT
        pol.po_line_id,
        pol.line_number,
        COALESCE(pol.item_id, 0) AS item_id,
        COALESCE(pol.item_code, pol.item_id::text, '') AS item_number,
        pol.item_description,
        COALESCE(pol.quantity, 0)::numeric AS ordered_quantity,
        COALESCE(scan_summary.received_quantity, 0)::numeric AS received_quantity,
        GREATEST(COALESCE(pol.quantity, 0) - COALESCE(scan_summary.received_quantity, 0), 0)::numeric AS remaining_quantity,
        CASE
          WHEN COALESCE(pol.quantity, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(scan_summary.received_quantity, 0) / pol.quantity) * 100, 2)
        END::numeric AS progress_percent,
        scan_summary.received_serial_start AS serial_start,
        scan_summary.received_serial_end AS serial_end
      FROM purchase_order_lines pol
      LEFT JOIN (
        SELECT
          item_id,
          po_header_id,
          SUM(
            CASE
              WHEN status = 'in' THEN COALESCE(quantity, 0)
              ELSE COALESCE(quantity, 0) * -1
            END
          ) AS received_quantity,
          MIN(COALESCE(serial_start, serial_end)) FILTER (
            WHERE status = 'in' AND (serial_start IS NOT NULL OR serial_end IS NOT NULL)
          )::text AS received_serial_start,
          MAX(COALESCE(serial_end, serial_start)) FILTER (
            WHERE status = 'in' AND (serial_start IS NOT NULL OR serial_end IS NOT NULL)
          )::text AS received_serial_end
        FROM inbound_scans
        WHERE po_header_id = $1
        GROUP BY item_id, po_header_id
      ) scan_summary
        ON scan_summary.po_header_id = pol.po_header_id
       AND scan_summary.item_id = pol.item_id
      WHERE pol.po_header_id = $1
      ORDER BY pol.line_number ASC, pol.po_line_id ASC
    `,
    [poHeaderId],
  );

  return result.rows.map(row => ({
    ...row,
    ordered_quantity: Number(row.ordered_quantity ?? 0),
    received_quantity: Number(row.received_quantity ?? 0),
    remaining_quantity: Number(row.remaining_quantity ?? 0),
    progress_percent: Number(row.progress_percent ?? 0),
  }));
};

const buildListWhereClause = (filters: IExportFilters) => {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.epc) {
    values.push(`%${filters.epc}%`);
    conditions.push(`scan.epc ILIKE $${values.length}`);
  }

  if (filters.po_header_id) {
    values.push(filters.po_header_id);
    conditions.push(`scan.po_header_id = $${values.length}`);
  }

  if (filters.location_id) {
    values.push(filters.location_id);
    conditions.push(`scan.location_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`scan.status = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    conditions.push(`scan.scanned_at >= $${values.length}`);
  }

  if (filters.to) {
    values.push(filters.to);
    conditions.push(`scan.scanned_at <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
};

const listScans = async (filters: IInboundListFilters): Promise<IInboundListResponse> => {
  const { limit = 20, offset = 0 } = filters;
  const { whereClause, values } = buildListWhereClause(filters);

  const dataQuery = `
    SELECT scan.*
    FROM inbound_scans scan
    ${whereClause}
    ORDER BY scan.scanned_at DESC, scan.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM inbound_scans scan
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query<IInboundScan>(dataQuery, [...values, limit, offset]),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const exportMovements = async (
  filters: IExportFilters,
  format: 'json' | 'csv' = 'json',
): Promise<IInboundLiveItem[] | string> => {
  const { limit = 1000, offset = 0 } = filters;
  const { whereClause, values } = buildListWhereClause(filters);

  const result = await pool.query<any>(
    `
      SELECT
        po.po_number,
        loc.location_code AS lot_no,
        loc.name AS location_name,
        loc.location_code,
        scan.item_id::text AS item_number,
        im.description AS item_description,
        (
          SELECT COALESCE(SUM(pol.quantity), 0)
          FROM purchase_order_lines pol
          WHERE pol.po_header_id = scan.po_header_id
            AND pol.item_id = scan.item_id
        )::numeric AS ordered_quantity,
        COALESCE(scan.quantity, 0)::bigint AS quantity,
        scan.epc,
        scan.serial_start::text AS serial_start,
        scan.serial_end::text AS serial_end,
        scan.status,
        scan.scanned_at AS updated_at
      FROM inbound_scans scan
      JOIN purchase_orders po ON po.po_header_id = scan.po_header_id
      JOIN erp_item_master im ON im.item = scan.item_id
      LEFT JOIN locations loc ON loc.id = scan.location_id
      ${whereClause}
      ORDER BY scan.scanned_at DESC, scan.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    [...values, limit, offset],
  );

  const rows: IInboundLiveItem[] = result.rows.map((row: any) => ({
    ...row,
    ordered_quantity: Number(row.ordered_quantity ?? 0),
    quantity: Number(row.quantity ?? 0),
  }));

  if (format === 'json') {
    return rows;
  }

  const header = [
    'po_number',
    'lot_no',
    'location_name',
    'location_code',
    'item_number',
    'item_description',
    'ordered_quantity',
    'quantity',
    'epc',
    'serial_start',
    'serial_end',
    'status',
    'updated_at',
  ];

  const csvRows = rows.map(row =>
    [
      row.po_number,
      row.lot_no ?? '',
      row.location_name ?? '',
      row.location_code ?? '',
      row.item_number,
      row.item_description ?? '',
      row.ordered_quantity ?? 0,
      row.quantity,
      row.epc,
      row.serial_start ?? '',
      row.serial_end ?? '',
      row.status ?? '',
      row.updated_at ?? '',
    ]
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );

  return [header.join(','), ...csvRows].join('\n');
};

export const InboundService = {
  recordScan,
  getLiveSummary,
  getItemWiseSummary,
  getPoSummary,
  exportMovements,
  listScans,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { io } from '../../../server';
import {
  IApproveLotReceivePayload,
  IPoLotReceiveSummaryRow,
} from './poLotReceive.interface';

type PoLotDetailRow = {
  id: number;
  po_header_id: number;
  interface_line_number: string;
  item_number: number;
  lot_number: string;
  transaction_quantity: string | number;
  expired_date: Date | string | null;
  item_description: string | null;
};

const STOCK_UPDATED_EVENT = 'stock_updated';

/** Net inbound quantity per item for a PO (status in/out). */
const fetchNetScannedByItem = async (poHeaderId: number): Promise<Map<number, number>> => {
  const result = await pool.query<{ item_id: string; net_qty: string }>(
    `
      SELECT
        scan.item_id::text AS item_id,
        COALESCE(
          SUM(
            CASE
              WHEN scan.status = 'in' THEN COALESCE(scan.quantity, 0)::numeric
              ELSE -COALESCE(scan.quantity, 0)::numeric
            END
          ),
          0
        )::numeric AS net_qty
      FROM inbound_scans scan
      WHERE scan.po_header_id = $1
      GROUP BY scan.item_id
    `,
    [poHeaderId],
  );

  const map = new Map<number, number>();
  for (const row of result.rows) {
    map.set(Number(row.item_id), Number(row.net_qty));
  }
  return map;
};

const fetchPoLotDetails = async (poHeaderId: number): Promise<PoLotDetailRow[]> => {
  const result = await pool.query<PoLotDetailRow>(
    `
      SELECT
        pld.id,
        pld.po_header_id,
        pld.interface_line_number,
        pld.item_number,
        pld.lot_number,
        pld.transaction_quantity,
        pld.expired_date,
        im.description AS item_description
      FROM po_lot_details pld
      JOIN erp_item_master im ON im.item = pld.item_number
      WHERE pld.po_header_id = $1
      ORDER BY
        pld.item_number ASC,
        pld.interface_line_number ASC,
        pld.lot_number ASC,
        pld.id ASC
    `,
    [poHeaderId],
  );
  return result.rows;
};

/** FIFO bucket-fill: each receipt lot caps allocation; order follows fetchPoLotDetails sort. */
const allocateFifoByItem = (
  lots: PoLotDetailRow[],
  netByItem: Map<number, number>,
): Map<number, number> => {
  const allocationByLotDetailId = new Map<number, number>();

  const byItem = new Map<number, PoLotDetailRow[]>();
  for (const row of lots) {
    const itemId = Number(row.item_number);
    if (!byItem.has(itemId)) {
      byItem.set(itemId, []);
    }
    byItem.get(itemId)!.push(row);
  }

  for (const [itemId, rows] of byItem) {
    let remaining = netByItem.get(itemId) ?? 0;
    if (remaining < 0) {
      remaining = 0;
    }

    for (const row of rows) {
      const cap = Number(row.transaction_quantity);
      const alloc = Math.min(remaining, cap);
      allocationByLotDetailId.set(row.id, alloc);
      remaining -= alloc;
    }
  }

  return allocationByLotDetailId;
};

const fetchApprovals = async (poHeaderId: number): Promise<Set<number>> => {
  const result = await pool.query<{ po_lot_detail_id: number }>(
    `
      SELECT po_lot_detail_id
      FROM stock_lot_approvals
      WHERE po_header_id = $1
    `,
    [poHeaderId],
  );

  const set = new Set<number>();
  for (const row of result.rows) {
    set.add(row.po_lot_detail_id);
  }
  return set;
};

const getPoNumber = async (poHeaderId: number): Promise<string> => {
  const result = await pool.query<{ po_number: string }>(
    `SELECT po_number FROM purchase_orders WHERE po_header_id = $1 LIMIT 1`,
    [poHeaderId],
  );
  if ((result.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }
  return result.rows[0].po_number;
};

const getLotReceiveSummary = async (
  poHeaderId: number,
): Promise<IPoLotReceiveSummaryRow[]> => {
  const po_number = await getPoNumber(poHeaderId);

  const [lots, netByItem, approvedLotDetailIds] = await Promise.all([
    fetchPoLotDetails(poHeaderId),
    fetchNetScannedByItem(poHeaderId),
    fetchApprovals(poHeaderId),
  ]);
  const allocation = allocateFifoByItem(lots, netByItem);

  return lots.map(row => {
    const itemId = Number(row.item_number);
    const allocated = allocation.get(row.id) ?? 0;
    const approved = approvedLotDetailIds.has(row.id);
    const approval_status = approved ? 'received' : 'pending';
    const can_approve = !approved && allocated > 0;

    return {
      po_lot_detail_id: row.id,
      po_header_id: row.po_header_id,
      po_number,
      interface_line_number: row.interface_line_number,
      item_id: itemId,
      item_description: row.item_description ?? null,
      lot_number: row.lot_number,
      ordered_quantity: Number(row.transaction_quantity),
      allocated_scanned_quantity: allocated,
      expired_date: row.expired_date
        ? new Date(row.expired_date as any).toISOString()
        : null,
      approval_status,
      can_approve,
    };
  });
};

const loadPoLotDetailById = async (
  poHeaderId: number,
  poLotDetailId: number,
): Promise<PoLotDetailRow> => {
  const result = await pool.query<PoLotDetailRow>(
    `
      SELECT
        pld.id,
        pld.po_header_id,
        pld.interface_line_number,
        pld.item_number,
        pld.lot_number,
        pld.transaction_quantity,
        pld.expired_date,
        im.description AS item_description
      FROM po_lot_details pld
      JOIN erp_item_master im ON im.item = pld.item_number
      WHERE pld.id = $1 AND pld.po_header_id = $2
      LIMIT 1
    `,
    [poLotDetailId, poHeaderId],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lot line not found for this purchase order');
  }

  return result.rows[0];
};

const approveLotReceive = async (
  poHeaderId: number,
  payload: IApproveLotReceivePayload,
): Promise<{ quantity_posted: number }> => {
  const detail = await loadPoLotDetailById(poHeaderId, payload.po_lot_detail_id);

  const netByItem = await fetchNetScannedByItem(poHeaderId);
  const lots = await fetchPoLotDetails(poHeaderId);
  const allocation = allocateFifoByItem(lots, netByItem);
  const qty = allocation.get(detail.id) ?? 0;

  if (qty <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No scanned quantity allocated to this lot; nothing to approve',
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const itemId = Number(detail.item_number);

    const existing = await client.query(
      `
        SELECT 1 FROM stock_lot_approvals
        WHERE po_lot_detail_id = $1
        FOR UPDATE
      `,
      [detail.id],
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      throw new ApiError(httpStatus.CONFLICT, 'This lot has already been approved to stock');
    }

    await client.query(
      `
        INSERT INTO stock_lot_approvals (
          po_lot_detail_id, po_header_id, item_id, lot_number, quantity_posted, approved_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [detail.id, poHeaderId, itemId, detail.lot_number, qty],
    );

    await client.query(
      `
        INSERT INTO stock (
          po_lot_detail_id, po_header_id, item_id, lot_number, quantity, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (po_lot_detail_id)
        DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()
      `,
      [detail.id, poHeaderId, itemId, detail.lot_number, qty],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  const po_number = await getPoNumber(poHeaderId);

  if (io) {
    io.emit(STOCK_UPDATED_EVENT, {
      po_number,
      item_number: String(detail.item_number),
      lot_no: detail.lot_number,
      quantity: qty,
    });
  }

  return { quantity_posted: qty };
};

export const PoLotReceiveService = {
  getLotReceiveSummary,
  approveLotReceive,
};

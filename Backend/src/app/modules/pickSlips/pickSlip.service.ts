/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import * as XLSX from 'xlsx';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IFifoEpcRow, IPackItemInput } from './pickSlip.interface';

export const isEpcOnReleasedPickSlip = async (epc: string): Promise<boolean> => {
  const r = await pool.query(
    `
      SELECT 1
      FROM pick_slip_epcs e
      INNER JOIN pick_slips ps ON ps.id = e.pick_slip_id
      WHERE e.epc = $1 AND ps.status = 'released'
      LIMIT 1
    `,
    [epc.trim()],
  );
  return (r.rowCount ?? 0) > 0;
};

const resolveItemId = async (itemNumber: string): Promise<bigint> => {
  const r = await pool.query(`SELECT item FROM erp_item_master WHERE item::text = $1 LIMIT 1`, [itemNumber.trim()]);
  if ((r.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unknown item: ${itemNumber}`);
  }
  return BigInt(r.rows[0].item);
};

const nextPickSlipNumber = (): string => `PS-${Date.now()}`;

export const listFifoEpcsForItem = async (itemNumber: string, limit = 500): Promise<IFifoEpcRow[]> => {
  const r = await pool.query(
    `
      SELECT
        pc.rfid_code AS epc,
        pc.serial_start::text AS serial_start,
        pc.serial_end::text AS serial_end,
        s.lot_number AS stock_lot_number,
        po.po_number AS stock_po_number,
        pc.quantity::text AS quantity
      FROM stock s
      JOIN purchase_orders po ON po.po_header_id = s.po_header_id
      JOIN po_codes pc ON pc.po_header_id = s.po_header_id AND pc.item_id = s.item_id
      WHERE s.item_id::text = $1 AND (s.quantity)::numeric > 0
      ORDER BY s.created_at ASC, s.lot_number ASC, po.po_number ASC, pc.id ASC
      LIMIT $2
    `,
    [itemNumber.trim(), limit],
  );
  return r.rows.map((row: any) => ({
    epc: String(row.epc),
    serial_start: row.serial_start != null ? String(row.serial_start) : null,
    serial_end: row.serial_end != null ? String(row.serial_end) : null,
    stock_lot_number: String(row.stock_lot_number ?? ''),
    stock_po_number: String(row.stock_po_number ?? ''),
    quantity:
      row.quantity != null && String(row.quantity).trim() !== ''
        ? String(row.quantity).trim()
        : null,
  }));
};

export const createPickSlipFromPackItems = async (
  requisitionId: number,
  items: IPackItemInput[],
): Promise<{ id: number; pick_slip_number: string; requisition_id: number }> => {
  if (!items.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one item/EPC is required');
  }

  const req = await pool.query(`SELECT id, status FROM requisitions WHERE id = $1`, [requisitionId]);
  if ((req.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pickSlipNumber = nextPickSlipNumber();
    const ps = await client.query(
      `
        INSERT INTO pick_slips (pick_slip_number, requisition_id, status, created_at, updated_at)
        VALUES ($1, $2, 'released', NOW(), NOW())
        RETURNING id
      `,
      [pickSlipNumber, requisitionId],
    );
    const pickSlipId = Number(ps.rows[0].id);

    const byItem = new Map<string, IPackItemInput[]>();
    for (const it of items) {
      const k = it.item_number.trim();
      const arr = byItem.get(k) ?? [];
      arr.push(it);
      byItem.set(k, arr);
    }

    for (const [itemNumber, group] of byItem) {
      const itemId = await resolveItemId(itemNumber);

      const lineRes = await client.query(
        `
          SELECT id FROM requisition_lines
          WHERE requisition_id = $1 AND item_id = $2
          ORDER BY id ASC
          LIMIT 1
        `,
        [requisitionId, itemId],
      );
      const requisitionLineId = lineRes.rows[0] ? Number(lineRes.rows[0].id) : null;

      /** Bucket EPCs by FIFO stock row (PO + lot) so multiple lots become multiple pick_slip_lines */
      type Bucket = { epcs: IPackItemInput[]; lot: string; po: string };
      const buckets = new Map<string, Bucket>();
      for (const it of group) {
        const stockRow = await client.query(
          `
            SELECT po.po_number, s.lot_number
            FROM po_codes pc
            JOIN stock s ON s.po_header_id = pc.po_header_id AND s.item_id = pc.item_id
            JOIN purchase_orders po ON po.po_header_id = s.po_header_id
            WHERE pc.rfid_code = $1 AND (s.quantity)::numeric > 0
            ORDER BY s.created_at ASC, s.lot_number ASC, po.po_number ASC
            LIMIT 1
          `,
          [it.epc.trim()],
        );
        const lotNumber = stockRow.rows[0] ? String(stockRow.rows[0].lot_number ?? '') : '';
        const stockPo = stockRow.rows[0] ? String(stockRow.rows[0].po_number ?? '') : '';
        const key = `${stockPo}||${lotNumber}`;
        const b = buckets.get(key) ?? { epcs: [], lot: lotNumber, po: stockPo };
        b.epcs.push(it);
        buckets.set(key, b);
      }

      for (const bucket of buckets.values()) {
        const lotNumber = bucket.lot;
        const stockPo = bucket.po;

        const lineIns = await client.query(
          `
            INSERT INTO pick_slip_lines (
              pick_slip_id, requisition_line_id, item_id, lot_number, picked_quantity,
              source_subinventory, source_location_code, created_at
            )
            VALUES ($1, $2, $3, $4, $5, NULL, NULL, NOW())
            RETURNING id
          `,
          [pickSlipId, requisitionLineId, itemId, lotNumber, bucket.epcs.length],
        );
        const lineId = Number(lineIns.rows[0].id);

        const serialLabels: string[] = [];
        for (const it of bucket.epcs) {
          const pc = await client.query(
            `SELECT serial_start::text AS s1, serial_end::text AS s2 FROM po_codes WHERE rfid_code = $1 LIMIT 1`,
            [it.epc.trim()],
          );
          const snap =
            pc.rows[0]?.s1 != null
              ? pc.rows[0].s2 != null && String(pc.rows[0].s1) !== String(pc.rows[0].s2)
                ? `${pc.rows[0].s1}-${pc.rows[0].s2}`
                : String(pc.rows[0].s1)
              : null;
          if (snap) serialLabels.push(snap);

          await client.query(
            `
              INSERT INTO pick_slip_epcs (
                pick_slip_id, pick_slip_line_id, item_id, epc, lot_number, serial_snapshot, stock_po_number, stock_lot_number, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `,
            [pickSlipId, lineId, itemId, it.epc.trim(), lotNumber, snap, stockPo || null, lotNumber || null],
          );
        }

        if (serialLabels.length) {
          const sorted = [...serialLabels].sort();
          await client.query(
            `UPDATE pick_slip_lines SET
              from_serial = $1,
              to_serial = $2,
              lot_from_serial = $1,
              lot_to_serial = $2
            WHERE id = $3`,
            [sorted[0], sorted[sorted.length - 1], lineId],
          );
        }
      }
    }

    await client.query('COMMIT');
    return { id: pickSlipId, pick_slip_number: pickSlipNumber, requisition_id: requisitionId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const listPickSlipsAsPacks = async (query: {
  page?: number;
  limit?: number;
  requisition_id?: number;
  item_number?: string;
  epc?: string;
}): Promise<{ data: any[]; meta: any }> => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (query.requisition_id) {
    values.push(query.requisition_id);
    conditions.push(`ps.requisition_id = $${values.length}`);
  }
  if (query.item_number) {
    values.push(`%${query.item_number}%`);
    conditions.push(`EXISTS (SELECT 1 FROM pick_slip_epcs e WHERE e.pick_slip_id = ps.id AND e.item_id::text ILIKE $${values.length})`);
  }
  if (query.epc) {
    values.push(`%${query.epc}%`);
    conditions.push(`EXISTS (SELECT 1 FROM pick_slip_epcs e WHERE e.pick_slip_id = ps.id AND e.epc ILIKE $${values.length})`);
  }

  const where = conditions.join(' AND ');
  const countR = await pool.query(
    `SELECT COUNT(*)::int AS c FROM pick_slips ps WHERE ${where}`,
    values,
  );
  const total = countR.rows[0]?.c ?? 0;

  values.push(limit, offset);
  const lim = values.length - 1;
  const off = values.length;
  const listR = await pool.query(
    `
      SELECT ps.*, r.status AS requisition_status, r.requisition_number
      FROM pick_slips ps
      JOIN requisitions r ON r.id = ps.requisition_id
      WHERE ${where}
      ORDER BY ps.id DESC
      LIMIT $${lim} OFFSET $${off}
    `,
    values,
  );

  const data = [];
  for (const row of listR.rows) {
    const epcs = await pool.query(
      `SELECT epc, item_id::text AS item_number FROM pick_slip_epcs WHERE pick_slip_id = $1 ORDER BY id ASC`,
      [row.id],
    );
    data.push({
      id: Number(row.id),
      pick_slip_number: String(row.pick_slip_number ?? ''),
      status: String(row.status ?? ''),
      requisition_id: Number(row.requisition_id),
      requisition_status: row.requisition_status,
      requisition_number: row.requisition_number,
      items: epcs.rows.map((e: any) => ({ item_number: e.item_number, epc: e.epc })),
    });
  }

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const getPickSlipPackById = async (id: number): Promise<any | null> => {
  const row = await pool.query(
    `
      SELECT ps.*, r.status AS requisition_status, r.requisition_number
      FROM pick_slips ps
      JOIN requisitions r ON r.id = ps.requisition_id
      WHERE ps.id = $1
    `,
    [id],
  );
  if ((row.rowCount ?? 0) === 0) return null;
  const head = row.rows[0];
  const epcs = await pool.query(
    `
      SELECT
        e.epc,
        e.item_id::text AS item_number,
        e.stock_po_number,
        e.stock_lot_number,
        e.serial_snapshot,
        im.description AS item_description
      FROM pick_slip_epcs e
      JOIN erp_item_master im ON im.item = e.item_id
      WHERE e.pick_slip_id = $1
      ORDER BY e.id ASC
    `,
    [id],
  );
  return {
    id: Number(head.id),
    pick_slip_number: String(head.pick_slip_number ?? ''),
    status: String(head.status ?? ''),
    requisition_id: Number(head.requisition_id),
    requisition_status: head.requisition_status,
    requisition_number: head.requisition_number,
    items: epcs.rows.map((e: any) => ({
      item_number: e.item_number,
      epc: e.epc,
      stock_po_number: e.stock_po_number ?? null,
      stock_lot_number: e.stock_lot_number ?? null,
      serial_snapshot: e.serial_snapshot ?? null,
      item_description: e.item_description ?? null,
    })),
  };
};

export const deletePickSlip = async (id: number): Promise<boolean> => {
  const r = await pool.query(`DELETE FROM pick_slips WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
};

export const updatePickSlipPack = async (
  id: number,
  body: { requisition_id?: number; items?: IPackItemInput[] },
): Promise<any | null> => {
  const existing = await getPickSlipPackById(id);
  if (!existing) return null;
  if (!body.items?.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'items required');
  }
  await deletePickSlip(id);
  return createPickSlipFromPackItems(body.requisition_id ?? existing.requisition_id, body.items);
};

export const buildSalesOrderTransactionSheet = async (pickSlipId: number): Promise<Buffer> => {
  const slip = await pool.query(
    `
      SELECT ps.*, r.source_order, r.transport_type_1, r.transport_type_2, r.vehicle_1, r.vehicle_2
      FROM pick_slips ps
      JOIN requisitions r ON r.id = ps.requisition_id
      WHERE ps.id = $1
    `,
    [pickSlipId],
  );
  if ((slip.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Pick slip not found');
  }
  const head = slip.rows[0];

  const lines = await pool.query(
    `
      SELECT
        psl.*,
        im.description AS item_description,
        rl.requested_quantity AS req_line_qty,
        rl.item_type AS rl_item_type,
        rl.source_subinventory AS rl_subinv,
        rl.source_location_code AS rl_loc
      FROM pick_slip_lines psl
      JOIN erp_item_master im ON im.item = psl.item_id
      LEFT JOIN requisition_lines rl ON rl.id = psl.requisition_line_id
      WHERE psl.pick_slip_id = $1
      ORDER BY psl.id ASC
    `,
    [pickSlipId],
  );

  const headers = [
    'Pick Slip',
    'Source Order',
    'Item',
    'Item Type',
    'Requested Quantity',
    'Picked Quantity',
    'Source Subinventory',
    'Source Location',
    'From Serial Number',
    'To Serial Number',
    'Lot',
    'LOT From Serial',
    'LOT To Serial',
    'TransportType1',
    'TransportType2',
    'Vehicle1',
    'Vehicle2',
  ];

  const rows: any[][] = [headers];

  for (const L of lines.rows) {
    const itemType = L.rl_item_type || (L.item_description ? String(L.item_description).split(' ')[0] : '');
    rows.push([
      head.pick_slip_number,
      head.source_order ?? '',
      String(L.item_id),
      itemType,
      Number(L.req_line_qty ?? 0),
      Number(L.picked_quantity ?? 0),
      L.rl_subinv ?? L.source_subinventory ?? '',
      L.rl_loc ?? L.source_location_code ?? '',
      L.from_serial ?? '',
      L.to_serial ?? '',
      L.lot_number ?? '',
      L.lot_from_serial ?? L.from_serial ?? '',
      L.lot_to_serial ?? L.to_serial ?? '',
      head.transport_type_1 ?? '',
      head.transport_type_2 ?? '',
      head.vehicle_1 ?? '',
      head.vehicle_2 ?? '',
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Business rule: packed quantity cell must always be 50,000 in export template.
  ws.E2 = { t: 'n', v: 50000 };
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Order Transaction');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

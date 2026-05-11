/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import {
  ICreateRequisitionInput,
  IRequisitionLineRow,
  IRequisitionRow,
  RequisitionStatus,
} from './requisition.interface';

const mapLine = (row: any): IRequisitionLineRow => {
  const qty = Number(row.requested_quantity ?? 0);
  const itemId = String(row.item_id);
  return {
    id: Number(row.id),
    requisition_id: Number(row.requisition_id),
    item_id: itemId,
    item_number: itemId,
    item_type: row.item_type ?? null,
    requested_quantity: qty,
    quantity: qty,
    source_subinventory: row.source_subinventory ?? null,
    source_location_code: row.source_location_code ?? null,
    uom: row.uom ?? null,
  };
};

const mapReq = (row: any, items?: IRequisitionLineRow[]): IRequisitionRow => ({
  id: Number(row.id),
  requisition_number: row.requisition_number,
  source_order: row.source_order ?? null,
  distribution_partner_name: row.distribution_partner_name ?? '',
  address: row.address ?? '',
  organization_code: row.organization_code ?? '',
  description: row.description ?? null,
  status: row.status as RequisitionStatus,
  transport_type_1: row.transport_type_1 ?? null,
  transport_type_2: row.transport_type_2 ?? null,
  vehicle_1: row.vehicle_1 ?? null,
  vehicle_2: row.vehicle_2 ?? null,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
  items,
});

const resolveItemId = async (itemNumber: string): Promise<bigint> => {
  const r = await pool.query(`SELECT item FROM erp_item_master WHERE item::text = $1 LIMIT 1`, [itemNumber.trim()]);
  if ((r.rowCount ?? 0) === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unknown item: ${itemNumber}`);
  }
  return BigInt(r.rows[0].item);
};

const loadLines = async (requisitionId: number): Promise<IRequisitionLineRow[]> => {
  const r = await pool.query(
    `SELECT * FROM requisition_lines WHERE requisition_id = $1 ORDER BY id ASC`,
    [requisitionId],
  );
  return r.rows.map(mapLine);
};

export const listRequisitions = async (query: {
  searchTerm?: string;
  requisition_number?: string;
  distribution_partner_name?: string;
  organization_code?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{ data: IRequisitionRow[]; meta: any }> => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const values: any[] = [];

  if (query.requisition_number) {
    values.push(`%${query.requisition_number}%`);
    conditions.push(`r.requisition_number ILIKE $${values.length}`);
  }
  if (query.distribution_partner_name) {
    values.push(`%${query.distribution_partner_name}%`);
    conditions.push(`r.distribution_partner_name ILIKE $${values.length}`);
  }
  if (query.organization_code) {
    values.push(`%${query.organization_code}%`);
    conditions.push(`r.organization_code ILIKE $${values.length}`);
  }
  if (query.status) {
    values.push(query.status);
    conditions.push(`r.status = $${values.length}`);
  }
  if (query.searchTerm) {
    values.push(`%${query.searchTerm}%`);
    const i = values.length;
    conditions.push(
      `(r.requisition_number ILIKE $${i} OR r.source_order ILIKE $${i} OR r.description ILIKE $${i})`,
    );
  }

  const where = conditions.join(' AND ');
  const sortCol =
    query.sortBy === 'requisition_number'
      ? 'r.requisition_number'
      : query.sortBy === 'status'
        ? 'r.status'
        : 'r.created_at';
  const dir = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM requisitions r WHERE ${where}`, values);
  const total = countR.rows[0]?.c ?? 0;

  values.push(limit, offset);
  const limIdx = values.length - 1;
  const offIdx = values.length;
  const listR = await pool.query(
    `SELECT r.* FROM requisitions r WHERE ${where} ORDER BY ${sortCol} ${dir} LIMIT $${limIdx} OFFSET $${offIdx}`,
    values,
  );

  const data: IRequisitionRow[] = [];
  for (const row of listR.rows) {
    const items = await loadLines(Number(row.id));
    data.push(mapReq(row, items));
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

export const getRequisitionById = async (id: number): Promise<IRequisitionRow | null> => {
  const r = await pool.query(`SELECT * FROM requisitions WHERE id = $1`, [id]);
  if ((r.rowCount ?? 0) === 0) return null;
  const items = await loadLines(id);
  return mapReq(r.rows[0], items);
};

export const createRequisition = async (payload: ICreateRequisitionInput): Promise<IRequisitionRow> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query(`SELECT 1 FROM requisitions WHERE requisition_number = $1`, [
      payload.requisition_number,
    ]);
    if ((dup.rowCount ?? 0) > 0) {
      throw new ApiError(httpStatus.CONFLICT, 'Requisition number already exists');
    }

    const ins = await client.query(
      `
        INSERT INTO requisitions (
          requisition_number, source_order, distribution_partner_name, address, organization_code,
          description, status, transport_type_1, transport_type_2, vehicle_1, vehicle_2, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `,
      [
        payload.requisition_number,
        payload.source_order ?? null,
        payload.distribution_partner_name,
        payload.address,
        payload.organization_code,
        payload.description ?? null,
        payload.status ?? 'pending',
        payload.transport_type_1 ?? null,
        payload.transport_type_2 ?? null,
        payload.vehicle_1 ?? null,
        payload.vehicle_2 ?? null,
      ],
    );

    const reqId = Number(ins.rows[0].id);

    for (const line of payload.items) {
      const itemId = await resolveItemId(line.item_number);
      await client.query(
        `
          INSERT INTO requisition_lines (
            requisition_id, item_id, item_type, requested_quantity, source_subinventory, source_location_code, uom, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `,
        [
          reqId,
          itemId,
          line.item_type ?? null,
          line.quantity,
          line.source_subinventory ?? null,
          line.source_location_code ?? null,
          line.uom ?? null,
        ],
      );
    }

    await client.query('COMMIT');
    return (await getRequisitionById(reqId)) as IRequisitionRow;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const updateRequisition = async (
  id: number,
  payload: Partial<ICreateRequisitionInput>,
): Promise<IRequisitionRow | null> => {
  const existing = await getRequisitionById(id);
  if (!existing) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (payload.requisition_number && payload.requisition_number !== existing.requisition_number) {
      const dup = await client.query(`SELECT 1 FROM requisitions WHERE requisition_number = $1 AND id <> $2`, [
        payload.requisition_number,
        id,
      ]);
      if ((dup.rowCount ?? 0) > 0) {
        throw new ApiError(httpStatus.CONFLICT, 'Requisition number already exists');
      }
    }

    const fields: string[] = [];
    const vals: any[] = [];
    const push = (col: string, v: any) => {
      vals.push(v);
      fields.push(`${col} = $${vals.length}`);
    };

    if (payload.requisition_number !== undefined) push('requisition_number', payload.requisition_number);
    if (payload.source_order !== undefined) push('source_order', payload.source_order);
    if (payload.distribution_partner_name !== undefined)
      push('distribution_partner_name', payload.distribution_partner_name);
    if (payload.address !== undefined) push('address', payload.address);
    if (payload.organization_code !== undefined) push('organization_code', payload.organization_code);
    if (payload.description !== undefined) push('description', payload.description);
    if (payload.status !== undefined) push('status', payload.status);
    if (payload.transport_type_1 !== undefined) push('transport_type_1', payload.transport_type_1);
    if (payload.transport_type_2 !== undefined) push('transport_type_2', payload.transport_type_2);
    if (payload.vehicle_1 !== undefined) push('vehicle_1', payload.vehicle_1);
    if (payload.vehicle_2 !== undefined) push('vehicle_2', payload.vehicle_2);

    if (fields.length) {
      fields.push('updated_at = NOW()');
      vals.push(id);
      await client.query(`UPDATE requisitions SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
    }

    if (payload.items !== undefined) {
      await client.query(`DELETE FROM requisition_lines WHERE requisition_id = $1`, [id]);
      for (const line of payload.items) {
        const itemId = await resolveItemId(line.item_number);
        await client.query(
          `
            INSERT INTO requisition_lines (
              requisition_id, item_id, item_type, requested_quantity, source_subinventory, source_location_code, uom, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `,
          [
            id,
            itemId,
            line.item_type ?? null,
            line.quantity,
            line.source_subinventory ?? null,
            line.source_location_code ?? null,
            line.uom ?? null,
          ],
        );
      }
    }

    await client.query('COMMIT');
    return getRequisitionById(id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const deleteRequisition = async (id: number): Promise<boolean> => {
  const r = await pool.query(`DELETE FROM requisitions WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
};

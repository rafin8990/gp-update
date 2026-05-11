/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import {
  ICreatePoTransactionReceiptWithLotsRequest,
  IPoLotDetail,
  IPoTransactionReceipt,
  IUpdatePoTransactionReceiptWithLotsRequest,
} from './poTransactionReceipt.interface';
import { buildOracleExportBuffer } from './oraclePoExport';

type IReceiptWithLotsResponse = {
  receipt: IPoTransactionReceipt;
  lots: IPoLotDetail[];
};

type IReceiptListFilters = {
  po_header_id?: number;
  interface_line_number?: string;
  transaction_type?: string;
  limit?: number;
  offset?: number;
};

type IReceiptListResponse = {
  data: IPoTransactionReceipt[];
  total: number;
};

const INTERFACE_LINE_PREFIX = 'RecvSimd';

/** Next free RecvSimd + 3-digit suffix (RecvSimd001 … RecvSimd999). */
const generateInterfaceLineNumber = async (): Promise<string> => {
  const prefix = INTERFACE_LINE_PREFIX;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { rows } = await pool.query<{ interface_line_number: string }>(
      `SELECT interface_line_number FROM po_transaction_receipt WHERE interface_line_number LIKE $1`,
      [`${prefix}%`],
    );

    const used = new Set<number>();
    for (const { interface_line_number: iln } of rows) {
      if (!iln.startsWith(prefix)) continue;
      const suffix = iln.slice(prefix.length);
      if (!/^\d{1,3}$/.test(suffix)) continue;
      const n = Number.parseInt(suffix, 10);
      if (n >= 0 && n <= 999) used.add(n);
    }

    if (used.size >= 1000) {
      break;
    }

    let candidateNum = -1;
    for (let n = 0; n < 1000; n += 1) {
      if (!used.has(n)) {
        candidateNum = n;
        break;
      }
    }

    if (candidateNum < 0) {
      break;
    }

    const candidate = `${prefix}${String(candidateNum).padStart(3, '0')}`;

    const exists = await pool.query(
      'SELECT 1 FROM po_transaction_receipt WHERE interface_line_number = $1 LIMIT 1',
      [candidate],
    );
    if (exists.rowCount === 0) {
      return candidate;
    }
  }

  throw new ApiError(
    httpStatus.INTERNAL_SERVER_ERROR,
    'Failed to generate unique interface_line_number',
  );
};

const createReceiptWithLots = async (
  payload: ICreatePoTransactionReceiptWithLotsRequest,
): Promise<IReceiptWithLotsResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { receipt, lots } = payload;

    const interfaceLineNumber =
      receipt.interface_line_number?.trim() || (await generateInterfaceLineNumber());

    const receiptInsertQuery = `
      INSERT INTO po_transaction_receipt (
        po_header_id, interface_line_number, transaction_type, transaction_date,
        source_document_code, receipt_source_code, header_interface_number, parent_transaction_id,
        organization_code, document_number, document_line_number, document_schedule_number,
        business_unit, sub_inventory, uom, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING *;
    `;

    const receiptValues = [
      receipt.po_header_id,
      interfaceLineNumber,
      receipt.transaction_type ?? 'deliver',
      receipt.transaction_date ?? null,
      receipt.source_document_code ?? 'PO',
      receipt.receipt_source_code ?? 'Vendor',
      receipt.header_interface_number?.trim() || interfaceLineNumber,
      receipt.parent_transaction_id ?? null,
      receipt.organization_code ?? null,
      receipt.document_number ?? null,
      receipt.document_line_number ?? '1',
      receipt.document_schedule_number ?? '1',
      receipt.business_unit ?? 'Grameenphone Ltd.',
      receipt.sub_inventory ?? 'prod',
      receipt.uom ?? null,
    ];

    const receiptResult = await client.query<IPoTransactionReceipt>(receiptInsertQuery, receiptValues);
    const createdReceipt = receiptResult.rows[0];

    const createdLots: IPoLotDetail[] = [];

    for (const lot of lots) {
      const lotInsertQuery = `
        INSERT INTO po_lot_details (
          po_header_id, interface_line_number, item_number, lot_number, transaction_quantity, expired_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *;
      `;
      const lotValues = [
        lot.po_header_id ?? receipt.po_header_id,
        interfaceLineNumber,
        lot.item_number,
        lot.lot_number,
        lot.transaction_quantity,
        lot.expired_date ?? null,
      ];
      const lotResult = await client.query<IPoLotDetail>(lotInsertQuery, lotValues);
      createdLots.push(lotResult.rows[0]);
    }

    await client.query('COMMIT');

    return { receipt: createdReceipt, lots: createdLots };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createReceipt = async (
  receipt: ICreatePoTransactionReceiptWithLotsRequest['receipt'],
): Promise<IPoTransactionReceipt> => {
  const interfaceLineNumber =
    receipt.interface_line_number?.trim() || (await generateInterfaceLineNumber());

  const query = `
    INSERT INTO po_transaction_receipt (
      po_header_id, interface_line_number, transaction_type, transaction_date,
      source_document_code, receipt_source_code, header_interface_number, parent_transaction_id,
      organization_code, document_number, document_line_number, document_schedule_number,
      business_unit, sub_inventory, uom, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, NOW(), NOW()
    )
    RETURNING *;
  `;

  const values = [
    receipt.po_header_id,
    interfaceLineNumber,
    receipt.transaction_type ?? 'deliver',
    receipt.transaction_date ?? null,
    receipt.source_document_code ?? 'PO',
    receipt.receipt_source_code ?? 'Vendor',
    receipt.header_interface_number?.trim() || interfaceLineNumber,
    receipt.parent_transaction_id ?? null,
    receipt.organization_code ?? null,
    receipt.document_number ?? null,
    receipt.document_line_number ?? '1',
    receipt.document_schedule_number ?? '1',
    receipt.business_unit ?? 'Grameenphone Ltd.',
    receipt.sub_inventory ?? 'prod',
    receipt.uom ?? null,
  ];

  const result = await pool.query<IPoTransactionReceipt>(query, values);
  return result.rows[0];
};

const createLot = async (lot: Omit<IPoLotDetail, 'id'>): Promise<IPoLotDetail> => {
  const query = `
    INSERT INTO po_lot_details (
      po_header_id, interface_line_number, item_number, lot_number, transaction_quantity, expired_date, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *;
  `;

  const values = [
    lot.po_header_id,
    lot.interface_line_number,
    lot.item_number,
    lot.lot_number,
    lot.transaction_quantity,
    lot.expired_date ?? null,
  ];

  const result = await pool.query<IPoLotDetail>(query, values);
  return result.rows[0];
};

const updateReceiptWithLots = async (
  payload: IUpdatePoTransactionReceiptWithLotsRequest,
): Promise<IReceiptWithLotsResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id, receipt, lots } = payload;
    let updatedReceipt: IPoTransactionReceipt | null = null;
    const receiptFields = Object.keys(receipt);

    if (receiptFields.length > 0) {
      const setClauses = receiptFields.map((field, index) => `${field} = $${index + 2}`);
      const values = [id, ...receiptFields.map(field => (receipt as any)[field])];
      const receiptQuery = `
        UPDATE po_transaction_receipt
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const receiptResult = await client.query<IPoTransactionReceipt>(receiptQuery, values);
      updatedReceipt = receiptResult.rows[0] || null;
    } else {
      const receiptResult = await client.query<IPoTransactionReceipt>(
        'SELECT * FROM po_transaction_receipt WHERE id = $1',
        [id],
      );
      updatedReceipt = receiptResult.rows[0] || null;
    }

    if (!updatedReceipt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Receipt does not exist');
    }

    const affectedLots: IPoLotDetail[] = [];
    if (lots && lots.length > 0) {
      for (const lot of lots) {
        const action = lot._action ?? 'update';

        if (action === 'create') {
          const insertQuery = `
            INSERT INTO po_lot_details (
              po_header_id, interface_line_number, item_number, lot_number, transaction_quantity, expired_date, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *;
          `;
          const insertValues = [
            lot.po_header_id ?? updatedReceipt.po_header_id,
            lot.interface_line_number ?? updatedReceipt.interface_line_number,
            lot.item_number,
            lot.lot_number,
            lot.transaction_quantity,
            lot.expired_date ?? null,
          ];
          const insertResult = await client.query<IPoLotDetail>(insertQuery, insertValues);
          affectedLots.push(insertResult.rows[0]);
        } else if (action === 'update' && lot.id) {
          const { id: lotId, _action, ...fieldsToUpdate } = lot;
          const lotFields = Object.keys(fieldsToUpdate);
          if (lotFields.length === 0) continue;
          const setClauses = lotFields.map((field, index) => `${field} = $${index + 2}`);
          const values = [lotId, ...lotFields.map(field => (fieldsToUpdate as any)[field])];
          const updateQuery = `
            UPDATE po_lot_details
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *;
          `;
          const updateResult = await client.query<IPoLotDetail>(updateQuery, values);
          if (updateResult.rows[0]) affectedLots.push(updateResult.rows[0]);
        } else if (action === 'delete' && lot.id) {
          const deleteResult = await client.query<IPoLotDetail>(
            'DELETE FROM po_lot_details WHERE id = $1 RETURNING *',
            [lot.id],
          );
          if (deleteResult.rows[0]) affectedLots.push(deleteResult.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    return { receipt: updatedReceipt, lots: affectedLots };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateReceipt = async (
  id: number,
  updates: Partial<IPoTransactionReceipt>,
): Promise<IPoTransactionReceipt | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectResult = await pool.query<IPoTransactionReceipt>(
      'SELECT * FROM po_transaction_receipt WHERE id = $1',
      [id],
    );
    return selectResult.rows[0] || null;
  }

  const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
  const values = [id, ...fields.map(field => (updates as any)[field])];

  const query = `
    UPDATE po_transaction_receipt
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query<IPoTransactionReceipt>(query, values);
  return result.rows[0] || null;
};

const updateLot = async (id: number, updates: Partial<IPoLotDetail>): Promise<IPoLotDetail | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectResult = await pool.query<IPoLotDetail>('SELECT * FROM po_lot_details WHERE id = $1', [id]);
    return selectResult.rows[0] || null;
  }

  const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
  const values = [id, ...fields.map(field => (updates as any)[field])];

  const query = `
    UPDATE po_lot_details
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query<IPoLotDetail>(query, values);
  return result.rows[0] || null;
};

const getReceiptById = async (
  id: number,
): Promise<{ receipt: IPoTransactionReceipt | null; lots: IPoLotDetail[] }> => {
  const receiptResult = await pool.query<IPoTransactionReceipt>(
    'SELECT * FROM po_transaction_receipt WHERE id = $1',
    [id],
  );
  const receipt = receiptResult.rows[0] || null;
  if (!receipt) return { receipt: null, lots: [] };

  const lotResult = await pool.query<IPoLotDetail>(
    'SELECT * FROM po_lot_details WHERE interface_line_number = $1 ORDER BY id',
    [receipt.interface_line_number],
  );

  return { receipt, lots: lotResult.rows };
};

const getLotById = async (id: number): Promise<IPoLotDetail | null> => {
  const result = await pool.query<IPoLotDetail>('SELECT * FROM po_lot_details WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const listReceipts = async (
  filters: IReceiptListFilters,
): Promise<IReceiptListResponse> => {
  const { po_header_id, interface_line_number, transaction_type, limit = 20, offset = 0 } = filters;

  const conditions: string[] = [];
  const values: any[] = [];

  if (po_header_id) {
    values.push(po_header_id);
    conditions.push(`po_header_id = $${values.length}`);
  }
  if (interface_line_number) {
    values.push(interface_line_number);
    conditions.push(`interface_line_number = $${values.length}`);
  }
  if (transaction_type) {
    values.push(transaction_type);
    conditions.push(`transaction_type ILIKE $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT *
    FROM po_transaction_receipt
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM po_transaction_receipt
    ${whereClause};
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query<IPoTransactionReceipt>(dataQuery, [...values, limit, offset]),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const deleteReceipt = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM po_transaction_receipt WHERE id = $1', [id]);
};

const deleteLot = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM po_lot_details WHERE id = $1', [id]);
};

/** Oracle interface workbook for one receipt (MVP: PO page picks latest receipt by created_at). */
const generateOracleExport = async (
  id: number,
): Promise<{ buffer: Buffer; filename: string }> => {
  const { receipt, lots } = await getReceiptById(id);
  if (!receipt) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PO transaction receipt not found');
  }
  const buffer = await buildOracleExportBuffer(receipt, lots);
  const safeLine = (receipt.interface_line_number || String(id)).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `oracle-rcv-${safeLine}.xlsm`;
  return { buffer, filename };
};

export const PoTransactionReceiptService = {
  createReceiptWithLots,
  createReceipt,
  createLot,
  updateReceiptWithLots,
  updateReceipt,
  updateLot,
  getReceiptById,
  getLotById,
  listReceipts,
  deleteReceipt,
  deleteLot,
  generateOracleExport,
};

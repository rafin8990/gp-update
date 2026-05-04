import pool from '../../../utils/dbClient';
import { IPoCode, ICreatePoCodeRequest, IUpdatePoCodeRequest } from './poCode.interface';

// Generate a 16-digit hex code
const generateHexCode = (): string => {
  const hexChars = '0123456789ABCDEF';
  let hexCode = '';
  for (let i = 0; i < 16; i++) {
    hexCode += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  return hexCode;
};

const createPoCode = async (payload: ICreatePoCodeRequest): Promise<IPoCode> => {
  // Auto-generate RFID code if not provided
  let rfidCode = payload.rfid_code;
  if (!rfidCode || rfidCode.trim() === '') {
    // Generate and ensure uniqueness
    let attempts = 0;
    do {
      rfidCode = generateHexCode();
      const checkQuery = 'SELECT id FROM po_codes WHERE rfid_code = $1';
      const checkResult = await pool.query(checkQuery, [rfidCode]);
      if (checkResult.rows.length === 0) {
        break; // Unique code found
      }
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique RFID code after multiple attempts');
      }
    } while (true);
  }

  // Calculate quantity from serial range if both serial numbers are provided
  // This ensures quantity is always correct even if client sends wrong value
  let finalQuantity = payload.quantity ?? null;
  if (payload.serial_start != null && payload.serial_end != null) {
    try {
      // Convert to BigInt for accurate calculation (handles both string and number)
      const start = typeof payload.serial_start === 'string' 
        ? BigInt(payload.serial_start) 
        : BigInt(payload.serial_start);
      const end = typeof payload.serial_end === 'string' 
        ? BigInt(payload.serial_end) 
        : BigInt(payload.serial_end);
      
      if (start <= end) {
        // Calculate: end - start + 1 (inclusive range)
        const calculatedQuantity = end - start + BigInt(1);
        // Convert to number (quantity should be small enough)
        finalQuantity = Number(calculatedQuantity);
      }
    } catch (error) {
      // If calculation fails, use provided quantity or null
      console.error('Error calculating quantity from serial range:', error);
    }
  }

  const query = `
    INSERT INTO po_codes (po_header_id, item_id, rfid_code, serial_start, serial_end, quantity, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *;
  `;

  const values = [
    payload.po_header_id,
    payload.item_id,
    rfidCode,
    payload.serial_start ?? null,
    payload.serial_end ?? null,
    finalQuantity,
  ];

  const result = await pool.query<IPoCode>(query, values);
  return result.rows[0];
};

const updatePoCode = async (
  id: number,
  updates: IUpdatePoCodeRequest
): Promise<IPoCode | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectQuery = 'SELECT * FROM po_codes WHERE id = $1';
    const selectResult = await pool.query<IPoCode>(selectQuery, [id]);
    return selectResult.rows[0] || null;
  }

  // If serial_start or serial_end are being updated, recalculate quantity
  // First, get current values to use for calculation
  const currentData = await pool.query<IPoCode>('SELECT * FROM po_codes WHERE id = $1', [id]);
  const current = currentData.rows[0];
  
  if (current) {
    const serialStart = updates.serial_start !== undefined ? updates.serial_start : current.serial_start;
    const serialEnd = updates.serial_end !== undefined ? updates.serial_end : current.serial_end;
    
    // Recalculate quantity if both serial numbers are present
    if (serialStart != null && serialEnd != null) {
      try {
        const start = typeof serialStart === 'string' 
          ? BigInt(serialStart) 
          : BigInt(serialStart);
        const end = typeof serialEnd === 'string' 
          ? BigInt(serialEnd) 
          : BigInt(serialEnd);
        
        if (start <= end) {
          const calculatedQuantity = end - start + BigInt(1);
          updates.quantity = Number(calculatedQuantity);
        }
      } catch (error) {
        console.error('Error calculating quantity from serial range in update:', error);
      }
    }
  }

  // Add updated_at automatically
  const allFields = Object.keys(updates);
  const setClauses = allFields.map((field, index) => `${field} = $${index + 2}`);
  setClauses.push('updated_at = NOW()');
  
  const values = [
    id,
    ...allFields.map(field => (updates as any)[field]),
  ];

  const query = `
    UPDATE po_codes
    SET ${setClauses.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query<IPoCode>(query, values);
  return result.rows[0] || null;
};

const getPoCodeById = async (id: number): Promise<IPoCode | null> => {
  const query = 'SELECT * FROM po_codes WHERE id = $1';
  const result = await pool.query<IPoCode>(query, [id]);
  return result.rows[0] || null;
};

const listPoCodes = async (filters: {
  po_header_id?: number;
  item_id?: number;
  rfid_code?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: IPoCode[]; total: number }> => {
  const {
    po_header_id,
    item_id,
    rfid_code,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions: string[] = [];
  const values: any[] = [];

  if (po_header_id) {
    values.push(po_header_id);
    conditions.push(`po_header_id = $${values.length}`);
  }

  if (item_id) {
    values.push(item_id);
    conditions.push(`item_id = $${values.length}`);
  }

  if (rfid_code) {
    values.push(`%${rfid_code}%`);
    conditions.push(`rfid_code ILIKE $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT *
    FROM po_codes
    ${whereClause}
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM po_codes
    ${whereClause};
  `;

  const dataValues = [
    ...values,
    limit,
    offset,
  ];

  const [dataResult, countResult] = await Promise.all([
    pool.query<IPoCode>(dataQuery, dataValues),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const deletePoCode = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM po_codes WHERE id = $1', [id]);
};

export const PoCodeService = {
  createPoCode,
  updatePoCode,
  getPoCodeById,
  listPoCodes,
  deletePoCode,
};

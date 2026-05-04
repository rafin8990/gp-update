import pool from '../../../utils/dbClient';
import {
  IPurchaseOrder,
  IPurchaseOrderLine,
  ICreatePurchaseOrderWithLinesRequest,
  IUpdatePurchaseOrderWithLinesRequest,
} from './purchaseOrder.interface';

const createPurchaseOrderWithLines = async (
  payload: ICreatePurchaseOrderWithLinesRequest
): Promise<{ po: IPurchaseOrder; lines: IPurchaseOrderLine[] }> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      po,
      lines,
    } = payload;

    if (!po.po_header_id) {
      throw new Error('po_header_id is required');
    }

    const poHeaderId = po.po_header_id;

    const poInsertQuery = `
      INSERT INTO purchase_orders (
        po_header_id,
        po_number,
        status_code,
        status_name,
        order_status,
        procurement_bu_id,
        procurement_bu_name,
        supplier_id,
        supplier_name,
        supplier_site_id,
        supplier_site_code,
        buyer_id,
        buyer_name,
        ship_to_location_id,
        ship_to_location_code,
        ship_to_address,
        currency_code,
        ordered_amount,
        tax_amount,
        total_amount,
        order_date,
        source_system,
        raw_payload
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23
      )
      RETURNING *;
    `;

    const poValues = [
      poHeaderId,
      po.po_number,
      po.status_code,
      po.status_name ?? null,
      po.order_status ?? 'pending',
      po.procurement_bu_id ?? null,
      po.procurement_bu_name ?? null,
      po.supplier_id ?? null,
      po.supplier_name ?? null,
      po.supplier_site_id ?? null,
      po.supplier_site_code ?? null,
      po.buyer_id ?? null,
      po.buyer_name ?? null,
      po.ship_to_location_id ?? null,
      po.ship_to_location_code ?? null,
      po.ship_to_address ?? null,
      po.currency_code ?? null,
      po.ordered_amount ?? null,
      po.tax_amount ?? null,
      po.total_amount ?? null,
      po.order_date ?? null,
      po.source_system ?? 'oracle_fusion',
      po.raw_payload ?? null,
    ];

    const poResult = await client.query<IPurchaseOrder>(poInsertQuery, poValues);
    const createdPo = poResult.rows[0];

    const createdLines: IPurchaseOrderLine[] = [];

    for (const line of lines) {
      if (!line.po_line_id) {
        throw new Error('po_line_id is required for all lines');
      }

      const poLineId = line.po_line_id;

      const lineInsertQuery = `
        INSERT INTO purchase_order_lines (
          po_line_id,
          po_header_id,
          line_number,
          line_status_code,
          line_status_name,
          line_type,
          item_id,
          item_code,
          item_description,
          category_code,
          uom_code,
          uom_name,
          quantity,
          unit_price,
          currency_code,
          line_amount,
          tax_amount,
          total_amount,
          serial_start,
          serial_end,
          raw_payload
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21
        )
        RETURNING *;
      `;

      const lineValues = [
        poLineId,
        poHeaderId,
        line.line_number,
        line.line_status_code,
        line.line_status_name ?? null,
        line.line_type ?? null,
        line.item_id ?? null,
        line.item_code ?? null,
        line.item_description ?? null,
        line.category_code ?? null,
        line.uom_code ?? null,
        line.uom_name ?? null,
        line.quantity ?? null,
        line.unit_price ?? null,
        line.currency_code ?? null,
        line.line_amount ?? null,
        line.tax_amount ?? null,
        line.total_amount ?? null,
        null,
        null,
        line.raw_payload ?? null,
      ];

      const lineResult = await client.query<IPurchaseOrderLine>(lineInsertQuery, lineValues);
      createdLines.push(lineResult.rows[0]);
    }

    await client.query('COMMIT');

    return {
      po: createdPo,
      lines: createdLines,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createPurchaseOrder = async (
  po: ICreatePurchaseOrderWithLinesRequest['po']
): Promise<IPurchaseOrder> => {
  if (!po.po_header_id) {
    throw new Error('po_header_id is required');
  }

  const poHeaderId = po.po_header_id;

  const query = `
    INSERT INTO purchase_orders (
      po_header_id,
      po_number,
      status_code,
      status_name,
      order_status,
      procurement_bu_id,
      procurement_bu_name,
      supplier_id,
      supplier_name,
      supplier_site_id,
      supplier_site_code,
      buyer_id,
      buyer_name,
      ship_to_location_id,
      ship_to_location_code,
      ship_to_address,
      currency_code,
      ordered_amount,
      tax_amount,
      total_amount,
      order_date,
      source_system,
      raw_payload
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22, $23
    )
    RETURNING *;
  `;

  const values = [
    poHeaderId,
    po.po_number,
    po.status_code,
    po.status_name ?? null,
    po.order_status ?? 'pending',
    po.procurement_bu_id ?? null,
    po.procurement_bu_name ?? null,
    po.supplier_id ?? null,
    po.supplier_name ?? null,
    po.supplier_site_id ?? null,
    po.supplier_site_code ?? null,
    po.buyer_id ?? null,
    po.buyer_name ?? null,
    po.ship_to_location_id ?? null,
    po.ship_to_location_code ?? null,
    po.ship_to_address ?? null,
    po.currency_code ?? null,
    po.ordered_amount ?? null,
    po.tax_amount ?? null,
    po.total_amount ?? null,
    po.order_date ?? null,
    po.source_system ?? 'oracle_fusion',
    po.raw_payload ?? null,
  ];

  const result = await pool.query<IPurchaseOrder>(query, values);
  return result.rows[0];
};

const createPurchaseOrderLine = async (
  line: IPurchaseOrderLine
): Promise<IPurchaseOrderLine> => {
  if (!line.po_line_id) {
    throw new Error('po_line_id is required');
  }

  const poLineId = line.po_line_id;

  const query = `
    INSERT INTO purchase_order_lines (
      po_line_id,
      po_header_id,
      line_number,
      line_status_code,
      line_status_name,
      line_type,
      item_id,
      item_code,
      item_description,
      category_code,
      uom_code,
      uom_name,
      quantity,
      unit_price,
      currency_code,
      line_amount,
      tax_amount,
      total_amount,
      serial_start,
      serial_end,
      raw_payload
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21
    )
    RETURNING *;
  `;

  const values = [
    poLineId,
    line.po_header_id,
    line.line_number,
    line.line_status_code,
    line.line_status_name ?? null,
    line.line_type ?? null,
    line.item_id ?? null,
    line.item_code ?? null,
    line.item_description ?? null,
    line.category_code ?? null,
    line.uom_code ?? null,
    line.uom_name ?? null,
    line.quantity ?? null,
    line.unit_price ?? null,
    line.currency_code ?? null,
    line.line_amount ?? null,
    line.tax_amount ?? null,
    line.total_amount ?? null,
    null,
    null,
    line.raw_payload ?? null,
  ];

  const result = await pool.query<IPurchaseOrderLine>(query, values);
  return result.rows[0];
};

const updatePurchaseOrderWithLines = async (
  payload: IUpdatePurchaseOrderWithLinesRequest
): Promise<{ po: IPurchaseOrder; lines: IPurchaseOrderLine[] }> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      po_header_id,
      po,
      lines,
    } = payload;

    const fields = Object.keys(po);
    const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = [
      po_header_id,
      ...fields.map(field => (po as any)[field]),
    ];

    const poUpdateQuery = `
      UPDATE purchase_orders
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE po_header_id = $1
      RETURNING *;
    `;

    const poResult = await client.query<IPurchaseOrder>(poUpdateQuery, values);
    const updatedPo = poResult.rows[0];

    const affectedLines: IPurchaseOrderLine[] = [];

    if (lines && lines.length > 0) {
      for (const line of lines) {
        const action = line._action ?? 'update';

        if (action === 'create') {
          if (!line.po_line_id) {
            throw new Error('po_line_id is required when creating a new line');
          }

          const poLineId = line.po_line_id;

          const insertQuery = `
            INSERT INTO purchase_order_lines (
              po_line_id,
              po_header_id,
              line_number,
              line_status_code,
              line_status_name,
              line_type,
              item_id,
              item_code,
              item_description,
              category_code,
              uom_code,
              uom_name,
              quantity,
              unit_price,
              currency_code,
              line_amount,
              tax_amount,
              total_amount,
              serial_start,
              serial_end,
              raw_payload
            )
            VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20,
              $21
            )
            RETURNING *;
          `;

          const insertValues = [
            poLineId,
            po_header_id,
            line.line_number,
            line.line_status_code,
            line.line_status_name ?? null,
            line.line_type ?? null,
            line.item_id ?? null,
            line.item_code ?? null,
            line.item_description ?? null,
            line.category_code ?? null,
            line.uom_code ?? null,
            line.uom_name ?? null,
            line.quantity ?? null,
            line.unit_price ?? null,
            line.currency_code ?? null,
            line.line_amount ?? null,
            line.tax_amount ?? null,
            line.total_amount ?? null,
            line.serial_start ?? null,
            line.serial_end ?? null,
            line.raw_payload ?? null,
          ];

          const insertResult = await client.query<IPurchaseOrderLine>(insertQuery, insertValues);
          affectedLines.push(insertResult.rows[0]);
        } else if (action === 'update' && line.po_line_id) {
          const {
            po_line_id,
            _action,
            ...lineUpdateFields
          } = line;

          const lineFields = Object.keys(lineUpdateFields);
          if (lineFields.length === 0) {
            continue;
          }

          const lineSetClauses = lineFields.map(
            (field, index) => `${field} = $${index + 2}`
          );
          const lineValues = [
            po_line_id,
            ...lineFields.map(field => (lineUpdateFields as any)[field]),
          ];

          const updateQuery = `
            UPDATE purchase_order_lines
            SET ${lineSetClauses.join(', ')}, updated_at = NOW()
            WHERE po_line_id = $1
            RETURNING *;
          `;

          const updateResult = await client.query<IPurchaseOrderLine>(updateQuery, lineValues);
          if (updateResult.rows[0]) {
            affectedLines.push(updateResult.rows[0]);
          }
        } else if (action === 'delete' && line.po_line_id) {
          const deleteQuery = `
            DELETE FROM purchase_order_lines
            WHERE po_line_id = $1
            RETURNING *;
          `;

          const deleteResult = await client.query<IPurchaseOrderLine>(deleteQuery, [line.po_line_id]);
          if (deleteResult.rows[0]) {
            affectedLines.push(deleteResult.rows[0]);
          }
        }
      }
    }

    await client.query('COMMIT');

    return {
      po: updatedPo,
      lines: affectedLines,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updatePurchaseOrder = async (
  po_header_id: number,
  updates: Partial<IPurchaseOrder>
): Promise<IPurchaseOrder | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectQuery = 'SELECT * FROM purchase_orders WHERE po_header_id = $1';
    const selectResult = await pool.query<IPurchaseOrder>(selectQuery, [po_header_id]);
    return selectResult.rows[0] || null;
  }

  const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
  const values = [
    po_header_id,
    ...fields.map(field => (updates as any)[field]),
  ];

  const query = `
    UPDATE purchase_orders
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE po_header_id = $1
    RETURNING *;
  `;

  const result = await pool.query<IPurchaseOrder>(query, values);
  return result.rows[0] || null;
};

const updatePurchaseOrderLine = async (
  po_line_id: number,
  updates: Partial<IPurchaseOrderLine>
): Promise<IPurchaseOrderLine | null> => {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const selectQuery = 'SELECT * FROM purchase_order_lines WHERE po_line_id = $1';
    const selectResult = await pool.query<IPurchaseOrderLine>(selectQuery, [po_line_id]);
    return selectResult.rows[0] || null;
  }

  const setClauses = fields.map((field, index) => `${field} = $${index + 2}`);
  const values = [
    po_line_id,
    ...fields.map(field => (updates as any)[field]),
  ];

  const query = `
    UPDATE purchase_order_lines
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE po_line_id = $1
    RETURNING *;
  `;

  const result = await pool.query<IPurchaseOrderLine>(query, values);
  return result.rows[0] || null;
};

const getPurchaseOrderById = async (
  po_header_id: number
): Promise<{ po: IPurchaseOrder | null; lines: IPurchaseOrderLine[] }> => {
  const poQuery = 'SELECT * FROM purchase_orders WHERE po_header_id = $1';
  const poResult = await pool.query<IPurchaseOrder>(poQuery, [po_header_id]);

  const linesQuery = 'SELECT * FROM purchase_order_lines WHERE po_header_id = $1 ORDER BY line_number';
  const linesResult = await pool.query<IPurchaseOrderLine>(linesQuery, [po_header_id]);

  return {
    po: poResult.rows[0] || null,
    lines: linesResult.rows,
  };
};

const getPurchaseOrderLineById = async (
  po_line_id: number
): Promise<IPurchaseOrderLine | null> => {
  const query = 'SELECT * FROM purchase_order_lines WHERE po_line_id = $1';
  const result = await pool.query<IPurchaseOrderLine>(query, [po_line_id]);
  return result.rows[0] || null;
};

const listPurchaseOrders = async (filters: {
  status_code?: string;
  supplier_id?: number;
  po_number?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: IPurchaseOrder[]; total: number }> => {
  const {
    status_code,
    supplier_id,
    po_number,
    limit = 20,
    offset = 0,
  } = filters;

  const conditions: string[] = [];
  const values: any[] = [];

  if (status_code) {
    values.push(status_code);
    conditions.push(`status_code = $${values.length}`);
  }

  if (supplier_id) {
    values.push(supplier_id);
    conditions.push(`supplier_id = $${values.length}`);
  }

  if (po_number) {
    values.push(po_number);
    conditions.push(`po_number = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT *
    FROM purchase_orders
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM purchase_orders
    ${whereClause};
  `;

  const dataValues = [
    ...values,
    limit,
    offset,
  ];

  const [dataResult, countResult] = await Promise.all([
    pool.query<IPurchaseOrder>(dataQuery, dataValues),
    pool.query<{ total: number }>(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

const deletePurchaseOrder = async (po_header_id: number): Promise<void> => {
  await pool.query('DELETE FROM purchase_orders WHERE po_header_id = $1', [po_header_id]);
};

const deletePurchaseOrderLine = async (po_line_id: number): Promise<void> => {
  await pool.query('DELETE FROM purchase_order_lines WHERE po_line_id = $1', [po_line_id]);
};

const bulkCreatePurchaseOrdersFromFile = async (
  requests: ICreatePurchaseOrderWithLinesRequest[]
): Promise<{
  success: number;
  failed: number;
  results: Array<{
    po_number: string;
    success: boolean;
    po?: IPurchaseOrder;
    lines?: IPurchaseOrderLine[];
    error?: string;
  }>;
}> => {
  const results: Array<{
    po_number: string;
    success: boolean;
    po?: IPurchaseOrder;
    lines?: IPurchaseOrderLine[];
    error?: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (const request of requests) {
    try {
      const result = await createPurchaseOrderWithLines(request);
      results.push({
        po_number: result.po.po_number,
        success: true,
        po: result.po,
        lines: result.lines,
      });
      successCount++;
    } catch (error) {
      results.push({
        po_number: request.po.po_number || 'UNKNOWN',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failedCount++;
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  };
};

export const PurchaseOrderService = {
  createPurchaseOrderWithLines,
  createPurchaseOrder,
  createPurchaseOrderLine,
  updatePurchaseOrderWithLines,
  updatePurchaseOrder,
  updatePurchaseOrderLine,
  getPurchaseOrderById,
  getPurchaseOrderLineById,
  listPurchaseOrders,
  deletePurchaseOrder,
  deletePurchaseOrderLine,
  bulkCreatePurchaseOrdersFromFile,
};


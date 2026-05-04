import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
  ICreatePurchaseOrderWithLinesRequest,
  IPurchaseOrder,
  IPurchaseOrderLine,
  OrderStatus,
} from './purchaseOrder.interface';

interface ParsedRow {
  // PO Header fields
  po_header_id?: string | number;
  po_number?: string;
  status_code?: string;
  status_name?: string;
  order_status?: string;
  procurement_bu_id?: string | number;
  procurement_bu_name?: string;
  supplier_id?: string | number;
  supplier_name?: string;
  supplier_site_id?: string | number;
  supplier_site_code?: string;
  buyer_id?: string | number;
  buyer_name?: string;
  ship_to_location_id?: string | number;
  ship_to_location_code?: string;
  ship_to_address?: string;
  currency_code?: string;
  ordered_amount?: string | number;
  tax_amount?: string | number;
  total_amount?: string | number;
  order_date?: string;
  source_system?: string;

  // PO Line fields
  po_line_id?: string | number;
  line_number?: string | number;
  line_status_code?: string;
  line_status_name?: string;
  line_type?: string;
  item_id?: string | number;
  item_code?: string;
  item_description?: string;
  category_code?: string;
  uom_code?: string;
  uom_name?: string;
  quantity?: string | number;
  unit_price?: string | number;
  line_amount?: string | number;
  line_tax_amount?: string | number;
  line_total_amount?: string | number;
  serial_start?: string;
  serial_end?: string;
}

const normalizeValue = (value: any): string | number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
  return isNaN(num) ? null : num;
};

const parseDate = (value: any): string | null => {
  if (!value) return null;
  const dateStr = String(value).trim();
  if (!dateStr) return null;
  // Try to parse and format as ISO string
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
};

const convertRowToPOData = (row: ParsedRow): {
  po: Partial<IPurchaseOrder>;
  line: Partial<IPurchaseOrderLine>;
} => {
  const orderStatusValue = normalizeValue(row.order_status) as string;
  const orderStatus: OrderStatus | undefined =
    orderStatusValue && ['pending', 'partially_received', 'full_received'].includes(orderStatusValue)
      ? (orderStatusValue as OrderStatus)
      : 'pending';

  const po: Partial<IPurchaseOrder> = {
    po_header_id: parseNumber(row.po_header_id) || undefined,
    po_number: normalizeValue(row.po_number) as string | undefined,
    status_code: normalizeValue(row.status_code) as string | undefined,
    status_name: normalizeValue(row.status_name) as string | undefined,
    order_status: orderStatus,
    procurement_bu_id: parseNumber(row.procurement_bu_id),
    procurement_bu_name: normalizeValue(row.procurement_bu_name) as string | undefined,
    supplier_id: parseNumber(row.supplier_id),
    supplier_name: normalizeValue(row.supplier_name) as string | undefined,
    supplier_site_id: parseNumber(row.supplier_site_id),
    supplier_site_code: normalizeValue(row.supplier_site_code) as string | undefined,
    buyer_id: parseNumber(row.buyer_id),
    buyer_name: normalizeValue(row.buyer_name) as string | undefined,
    ship_to_location_id: parseNumber(row.ship_to_location_id),
    ship_to_location_code: normalizeValue(row.ship_to_location_code) as string | undefined,
    ship_to_address: normalizeValue(row.ship_to_address) as string | undefined,
    currency_code: normalizeValue(row.currency_code) as string | undefined,
    ordered_amount: parseNumber(row.ordered_amount)?.toString() || null,
    tax_amount: parseNumber(row.tax_amount)?.toString() || null,
    total_amount: parseNumber(row.total_amount)?.toString() || null,
    order_date: parseDate(row.order_date),
    source_system: normalizeValue(row.source_system) as string | undefined || 'oracle_fusion',
  };

  const line: Partial<IPurchaseOrderLine> = {
    po_line_id: parseNumber(row.po_line_id) || undefined,
    line_number: parseNumber(row.line_number) || undefined,
    line_status_code: normalizeValue(row.line_status_code) as string | undefined,
    line_status_name: normalizeValue(row.line_status_name) as string | undefined,
    line_type: normalizeValue(row.line_type) as string | undefined,
    item_id: parseNumber(row.item_id),
    item_code: normalizeValue(row.item_code) as string | undefined,
    item_description: normalizeValue(row.item_description) as string | undefined,
    category_code: normalizeValue(row.category_code) as string | undefined,
    uom_code: normalizeValue(row.uom_code) as string | undefined,
    uom_name: normalizeValue(row.uom_name) as string | undefined,
    quantity: parseNumber(row.quantity)?.toString() || null,
    unit_price: parseNumber(row.unit_price)?.toString() || null,
    currency_code: normalizeValue(row.currency_code) as string | undefined,
    line_amount: parseNumber(row.line_amount)?.toString() || null,
    tax_amount: parseNumber(row.line_tax_amount)?.toString() || null,
    total_amount: parseNumber(row.line_total_amount)?.toString() || null,
    serial_start: normalizeValue(row.serial_start) as string | undefined,
    serial_end: normalizeValue(row.serial_end) as string | undefined,
  };

  return { po, line };
};

export const parseExcelFile = async (buffer: Buffer): Promise<ICreatePurchaseOrderWithLinesRequest[]> => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ParsedRow[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  if (rows.length === 0) {
    throw new Error('Excel file is empty or has no data rows');
  }

  // Group rows by po_number
  const poMap = new Map<string, { po: Partial<IPurchaseOrder>; lines: Partial<IPurchaseOrderLine>[] }>();

  for (const row of rows) {
    const { po, line } = convertRowToPOData(row);

    if (!po.po_header_id) {
      throw new Error(`Row missing required field: po_header_id`);
    }
    if (!po.po_number) {
      throw new Error(`Row missing required field: po_number`);
    }
    if (!po.status_code) {
      throw new Error(`Row missing required field: status_code for PO ${po.po_number}`);
    }
    if (!line.po_line_id) {
      throw new Error(`Row missing required field: po_line_id for PO ${po.po_number}`);
    }
    if (!line.line_number) {
      throw new Error(`Row missing required field: line_number for PO ${po.po_number}`);
    }
    if (!line.line_status_code) {
      throw new Error(`Row missing required field: line_status_code for PO ${po.po_number}, Line ${line.line_number}`);
    }

    const poNumber = po.po_number;

    if (!poMap.has(poNumber)) {
      poMap.set(poNumber, { po, lines: [] });
    }

    const poData = poMap.get(poNumber)!;
    // Merge PO data (later rows override earlier ones for same PO)
    Object.assign(poData.po, po);
    poData.lines.push(line);
  }

  // Convert to request format
  const result: ICreatePurchaseOrderWithLinesRequest[] = [];

  for (const [poNumber, { po, lines }] of poMap.entries()) {
    if (!po.po_header_id) {
      throw new Error(`Invalid PO data for PO number: ${poNumber} - missing po_header_id`);
    }
    if (!po.po_number || !po.status_code) {
      throw new Error(`Invalid PO data for PO number: ${poNumber}`);
    }

    const validLines = lines.filter(
      (line) => 
        line.po_line_id !== undefined &&
        line.line_number !== undefined && 
        line.line_status_code !== undefined
    );

    if (validLines.length === 0) {
      throw new Error(`No valid lines found for PO ${poNumber}`);
    }

    result.push({
      po: po as ICreatePurchaseOrderWithLinesRequest['po'],
      lines: validLines as ICreatePurchaseOrderWithLinesRequest['lines'],
    });
  }

  return result;
};

export const parseCsvFile = async (buffer: Buffer): Promise<ICreatePurchaseOrderWithLinesRequest[]> => {
  return new Promise((resolve, reject) => {
    const rows: ParsedRow[] = [];
    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(csv())
      .on('data', (row: ParsedRow) => {
        rows.push(row);
      })
      .on('end', () => {
        try {
          if (rows.length === 0) {
            reject(new Error('CSV file is empty or has no data rows'));
            return;
          }

          // Group rows by po_number
          const poMap = new Map<string, { po: Partial<IPurchaseOrder>; lines: Partial<IPurchaseOrderLine>[] }>();

          for (const row of rows) {
            const { po, line } = convertRowToPOData(row);

            if (!po.po_header_id) {
              reject(new Error(`Row missing required field: po_header_id`));
              return;
            }
            if (!po.po_number) {
              reject(new Error(`Row missing required field: po_number`));
              return;
            }
            if (!po.status_code) {
              reject(new Error(`Row missing required field: status_code for PO ${po.po_number}`));
              return;
            }
            if (!line.po_line_id) {
              reject(new Error(`Row missing required field: po_line_id for PO ${po.po_number}`));
              return;
            }
            if (!line.line_number) {
              reject(new Error(`Row missing required field: line_number for PO ${po.po_number}`));
              return;
            }
            if (!line.line_status_code) {
              reject(
                new Error(
                  `Row missing required field: line_status_code for PO ${po.po_number}, Line ${line.line_number}`
                )
              );
              return;
            }

            const poNumber = po.po_number;

            if (!poMap.has(poNumber)) {
              poMap.set(poNumber, { po, lines: [] });
            }

            const poData = poMap.get(poNumber)!;
            // Merge PO data (later rows override earlier ones for same PO)
            Object.assign(poData.po, po);
            poData.lines.push(line);
          }

          // Convert to request format
          const result: ICreatePurchaseOrderWithLinesRequest[] = [];

          for (const [poNumber, { po, lines }] of poMap.entries()) {
            if (!po.po_header_id) {
              reject(new Error(`Invalid PO data for PO number: ${poNumber} - missing po_header_id`));
              return;
            }
            if (!po.po_number || !po.status_code) {
              reject(new Error(`Invalid PO data for PO number: ${poNumber}`));
              return;
            }

            const validLines = lines.filter(
              (line) => 
                line.po_line_id !== undefined &&
                line.line_number !== undefined && 
                line.line_status_code !== undefined
            );

            if (validLines.length === 0) {
              reject(new Error(`No valid lines found for PO ${poNumber}`));
              return;
            }

            result.push({
              po: po as ICreatePurchaseOrderWithLinesRequest['po'],
              lines: validLines as ICreatePurchaseOrderWithLinesRequest['lines'],
            });
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

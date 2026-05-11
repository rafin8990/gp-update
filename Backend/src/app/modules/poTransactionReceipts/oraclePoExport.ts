import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IPoLotDetail, IPoTransactionReceipt } from './poTransactionReceipt.interface';

/** Primary Oracle Fusion sheet names (plural HEADERS / TRANSACTIONS / NUMBERS). */
const SHEET_ALIASES = {
  header: ['RCV_HEADERS_INTERFACE', 'RCV_HEADER_INTERFACE'],
  txn: ['RCV_TRANSACTIONS_INTERFACE', 'RCV_TRANSACTION_INTERFACE'],
  lots: ['INV_TRANSACTION_LOTS_INTERFACE'],
  serial: ['INV_SERIAL_NUMBERS_INTERFACE', 'INV_SERIAL_NUMBER_INTERFACE'],
} as const;

const MAX_CLEAR_ROW = 10000;

/** Oracle RAW/Fusion layout: hide user-facing header + API metadata rows; data starts below. */
const FUSION_HIDE_ROW_START = 4;
const FUSION_HIDE_ROW_END = 12;
const FUSION_FIRST_DATA_ROW = 13;
const FUSION_CLEAR_FROM_ROW = 10;

type PoCodeRow = {
  serial_start: string | null;
  serial_end: string | null;
  item_id: string | number;
};

const TEMPLATE_FILES = ['templete.xlsm', 'template.xlsm'];

/**
 * Resolves the Oracle .xlsm: ORACLE_PO_EXPORT_TEMPLATE, then paths relative to cwd,
 * this module (__dirname), and repo root. Works when `npm run dev` cwd is Backend or monorepo root.
 */
export function resolveOracleTemplatePath(): string {
  const env = process.env.ORACLE_PO_EXPORT_TEMPLATE?.trim();
  if (env && fs.existsSync(env)) return env;

  // oraclePoExport.ts -> .../Backend/src/app/modules/poTransactionReceipts
  const backendRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const repoRoot = path.resolve(backendRoot, '..');

  const dirs: string[] = [
    path.join(backendRoot, 'src', 'assets', 'po-receive-template'),
    path.join(repoRoot, 'Frontend', 'public', 'po-receive-templete'),
    path.join(repoRoot, 'Frontend', 'public', 'po-receive-template'),
    path.join(process.cwd(), 'src', 'assets', 'po-receive-template'),
    path.join(process.cwd(), 'Backend', 'src', 'assets', 'po-receive-template'),
    path.join(process.cwd(), 'public', 'po-receive-templete'),
    path.join(process.cwd(), 'Frontend', 'public', 'po-receive-templete'),
    path.join(process.cwd(), '..', 'Frontend', 'public', 'po-receive-templete'),
    path.join(process.cwd(), '..', 'Frontend', 'public', 'po-receive-template'),
  ];

  const candidates: string[] = [];
  for (const dir of dirs) {
    for (const file of TEMPLATE_FILES) {
      candidates.push(path.join(dir, file));
    }
  }

  const tried = new Set<string>();
  for (const p of candidates) {
    const norm = path.normalize(p);
    if (tried.has(norm)) continue;
    tried.add(norm);
    if (fs.existsSync(norm)) return norm;
  }

  throw new ApiError(
    httpStatus.INTERNAL_SERVER_ERROR,
    'Oracle export template not found. Place templete.xlsm (or template.xlsm) in ' +
      'Backend/src/assets/po-receive-template/ or Frontend/public/po-receive-templete/, ' +
      'or set ORACLE_PO_EXPORT_TEMPLATE to the full file path.',
  );
}

const firstPoReceiptCreatedAt = async (poHeaderId: number): Promise<Date | null> => {
  const { rows } = await pool.query<{ min: Date | null }>(
    'SELECT MIN(created_at) AS min FROM po_transaction_receipt WHERE po_header_id = $1',
    [poHeaderId],
  );
  const v = rows[0]?.min;
  return v ? new Date(v) : null;
};

const fetchPoCodesForItems = async (
  poHeaderId: number,
  itemNumbers: number[],
): Promise<PoCodeRow[]> => {
  if (itemNumbers.length === 0) return [];
  const { rows } = await pool.query<PoCodeRow>(
    `SELECT serial_start::text AS serial_start, serial_end::text AS serial_end, item_id
     FROM po_codes
     WHERE po_header_id = $1 AND item_id = ANY($2::bigint[])
     ORDER BY id`,
    [poHeaderId, itemNumbers],
  );
  return rows;
};

const cellText = (ws: XLSX.WorkSheet, addr: string): string => {
  const c = ws[addr] as XLSX.CellObject | undefined;
  if (!c) return '';
  if (c.w != null) return String(c.w);
  if (c.v instanceof Date) return c.v.toISOString();
  return String(c.v ?? '');
};

const detectFusionLayout = (ws: XLSX.WorkSheet): boolean => {
  for (const addr of ['B5', 'B6', 'B7', 'C6', 'D6', 'E6']) {
    const t = cellText(ws, addr).toUpperCase();
    if (t.includes('VARCHAR') || t.includes('VARCHAR2') || t === 'DATE' || t.startsWith('NUMBER')) {
      return true;
    }
  }
  const b5 = cellText(ws, 'B5');
  if (/RECEIPT|HEADER_NUMBER|INTERFACE_LINE|DOCUMENT_NUMBER/i.test(b5) && /_/.test(b5)) {
    return true;
  }
  return false;
};

/** Fusion: data row 13 (rows 4–12 hidden). Simple template: data from row 5. */
const getFirstDataRow = (ws: XLSX.WorkSheet): number =>
  detectFusionLayout(ws) ? FUSION_FIRST_DATA_ROW : 5;

/** Mark rows hidden in Excel (1-based inclusive). Preserves existing row height etc. */
const hideSheetRows = (ws: XLSX.WorkSheet, excelRowStart: number, excelRowEnd: number) => {
  if (!ws['!rows']) ws['!rows'] = [];
  const rows = ws['!rows'] as NonNullable<XLSX.WorkSheet['!rows']>;
  for (let r = excelRowStart; r <= excelRowEnd; r += 1) {
    const idx = r - 1;
    const prev = rows[idx];
    rows[idx] = { ...prev, hidden: true };
  }
};

/** Remove values from startRow downward so old sample/export rows disappear; keep cell styles (s) when present. */
const clearDataRowsFrom = (ws: XLSX.WorkSheet, startRow: number) => {
  for (const key of Object.keys(ws)) {
    if (key[0] === '!') continue;
    let cellAddr = key;
    if (key.includes(':')) continue;
    const m = /^([A-Za-z]+)(\d+)$/.exec(key.replace(/\$/g, ''));
    if (!m) continue;
    const rowNum = Number.parseInt(m[2], 10);
    if (rowNum < startRow || rowNum > MAX_CLEAR_ROW) continue;
    const prev = ws[key] as XLSX.CellObject;
    const style = prev?.s;
    const comment = prev?.c;
    if (style !== undefined || comment !== undefined) {
      ws[key] = {
        ...(style !== undefined ? { s: style } : {}),
        ...(comment !== undefined ? { c: comment } : {}),
      } as XLSX.CellObject;
    } else {
      delete ws[key];
    }
  }
};

const setCell = (ws: XLSX.WorkSheet, addr: string, value: string | number | Date | null | undefined) => {
  if (value === null || value === undefined) return;
  const prev = ws[addr] as XLSX.CellObject | undefined;
  const style = prev?.s;
  const comment = prev?.c;
  let cell: XLSX.CellObject;
  if (value instanceof Date) {
    cell = { t: 'd', v: value, z: 'yyyy-mm-dd hh:mm:ss' };
  } else if (typeof value === 'number') {
    cell = { t: 'n', v: value };
  } else {
    cell = { t: 's', v: String(value) };
  }
  if (style !== undefined) cell.s = style;
  if (comment !== undefined) cell.c = comment;
  ws[addr] = cell;
};

const noticeDateOnly = (d: Date): Date => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const normalizeSheetLabel = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');

/**
 * Finds a worksheet by canonical Oracle name; falls back to case-insensitive / punctuation-insensitive match.
 * If the workbook has 6+ sheets, uses the middle four (indices 1–4) per template layout (skip first & last).
 */
const resolveOracleSheets = (
  workbook: XLSX.WorkBook,
): { wsHeader: XLSX.WorkSheet; wsTxn: XLSX.WorkSheet; wsLots: XLSX.WorkSheet; wsSerial: XLSX.WorkSheet } => {
  const names = workbook.SheetNames || [];
  const sheets = workbook.Sheets;

  const pickSheet = (aliases: readonly string[]): XLSX.WorkSheet | undefined => {
    for (const canonical of aliases) {
      if (sheets[canonical]) return sheets[canonical];
    }
    for (const canonical of aliases) {
      const norm = normalizeSheetLabel(canonical);
      for (const n of names) {
        if (normalizeSheetLabel(n) === norm) return sheets[n];
      }
    }
    for (const canonical of aliases) {
      const compact = canonical.replace(/_/g, '').toLowerCase();
      for (const n of names) {
        if (n.replace(/[_\s]/g, '').toLowerCase() === compact) return sheets[n];
      }
    }
    return undefined;
  };

  let wsHeader = pickSheet(SHEET_ALIASES.header);
  let wsTxn = pickSheet(SHEET_ALIASES.txn);
  let wsLots = pickSheet(SHEET_ALIASES.lots);
  let wsSerial = pickSheet(SHEET_ALIASES.serial);

  const incomplete = !wsHeader || !wsTxn || !wsLots || !wsSerial;

  if (incomplete && names.length >= 6) {
    wsHeader = sheets[names[1]];
    wsTxn = sheets[names[2]];
    wsLots = sheets[names[3]];
    wsSerial = sheets[names[4]];
  } else if (incomplete && names.length === 4) {
    wsHeader = sheets[names[0]];
    wsTxn = sheets[names[1]];
    wsLots = sheets[names[2]];
    wsSerial = sheets[names[3]];
  } else if (incomplete && names.length === 5) {
    wsHeader = sheets[names[1]];
    wsTxn = sheets[names[2]];
    wsLots = sheets[names[3]];
    wsSerial = sheets[names[4]];
  }

  if (!wsHeader || !wsTxn || !wsLots || !wsSerial) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Template must expose the four Oracle data sheets (e.g. RCV_HEADERS_INTERFACE, …). ` +
        `Found sheets: ${names.join(', ') || '(none)'}.`,
    );
  }

  return { wsHeader, wsTxn, wsLots, wsSerial };
};

/**
 * One export = one receipt. Clears prior data rows on the four sheets, then fills values only.
 * RCV_HEADERS: A = Header Interface Number, E = Notice Creation Date (Oracle column layout).
 * RCV_TRANSACTIONS / INV_LOTS: one row per lot. INV_SERIAL_NUMBERS: one row per po_codes row.
 */
export const buildOracleExportBuffer = async (
  receipt: IPoTransactionReceipt,
  lots: IPoLotDetail[],
): Promise<Buffer> => {
  const templatePath = resolveOracleTemplatePath();
  const workbook = XLSX.readFile(templatePath, {
    type: 'file',
    cellDates: true,
    bookVBA: true,
    cellStyles: true,
    cellNF: true,
  });

  const noticeCreated = await firstPoReceiptCreatedAt(receipt.po_header_id);
  const itemNumbers = [...new Set(lots.map(l => l.item_number))];
  const poCodes = await fetchPoCodesForItems(receipt.po_header_id, itemNumbers);

  const { wsHeader, wsTxn, wsLots, wsSerial } = resolveOracleSheets(workbook);

  const rowHeader = getFirstDataRow(wsHeader);
  const rowTxn = getFirstDataRow(wsTxn);
  const rowLots = getFirstDataRow(wsLots);
  const rowSerial = getFirstDataRow(wsSerial);

  const clearFrom = (ws: XLSX.WorkSheet, dataRow: number) =>
    clearDataRowsFrom(ws, detectFusionLayout(ws) ? FUSION_CLEAR_FROM_ROW : dataRow);

  clearFrom(wsHeader, rowHeader);
  clearFrom(wsTxn, rowTxn);
  clearFrom(wsLots, rowLots);
  clearFrom(wsSerial, rowSerial);

  setCell(wsHeader, `A${rowHeader}`, receipt.header_interface_number ?? '');
  if (noticeCreated) {
    setCell(wsHeader, `E${rowHeader}`, noticeDateOnly(noticeCreated));
  }

  const txnCreated = receipt.created_at ? new Date(receipt.created_at) : new Date();

  lots.forEach((lot, i) => {
    const row = rowTxn + i;
    setCell(wsTxn, `A${row}`, receipt.interface_line_number);
    setCell(wsTxn, `B${row}`, 'DELIVER');
    setCell(wsTxn, `C${row}`, txnCreated);
    setCell(wsTxn, `E${row}`, 'PO');
    setCell(wsTxn, `F${row}`, 'VENDOR');
    setCell(wsTxn, `G${row}`, receipt.header_interface_number ?? '');
    setCell(wsTxn, `J${row}`, 'IPS');
    setCell(wsTxn, `N${row}`, receipt.document_number ?? '');
    setCell(wsTxn, `R${row}`, receipt.business_unit ?? '');
    setCell(wsTxn, `U${row}`, receipt.sub_inventory ?? '');
    setCell(wsTxn, `W${row}`, Number(lot.transaction_quantity));
    setCell(wsTxn, `X${row}`, receipt.uom ?? '');

    const lotRow = rowLots + i;
    setCell(wsLots, `A${lotRow}`, receipt.interface_line_number);
    setCell(wsLots, `B${lotRow}`, lot.lot_number);
    setCell(wsLots, `D${lotRow}`, Number(lot.transaction_quantity));
  });

  poCodes.forEach((pc, i) => {
    const row = rowSerial + i;
    setCell(wsSerial, `A${row}`, receipt.interface_line_number);
    const s0 = pc.serial_start != null ? String(pc.serial_start) : '';
    const s1 = pc.serial_end != null ? String(pc.serial_end) : '';
    setCell(wsSerial, `B${row}`, s0);
    setCell(wsSerial, `C${row}`, s1);
  });

  [wsHeader, wsTxn, wsLots, wsSerial].forEach(ws => {
    if (detectFusionLayout(ws)) {
      hideSheetRows(ws, FUSION_HIDE_ROW_START, FUSION_HIDE_ROW_END);
    }
  });

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsm',
    cellDates: true,
    bookVBA: true,
    cellStyles: true,
  }) as Buffer;
};

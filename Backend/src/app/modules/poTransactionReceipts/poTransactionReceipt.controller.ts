import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { PoTransactionReceiptService } from './poTransactionReceipt.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createWithLots = catchAsync(async (req: Request, res: Response) => {
  const result = await PoTransactionReceiptService.createReceiptWithLots(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'PO transaction receipt with lot details created successfully',
    data: result,
  });
});

const createReceipt = catchAsync(async (req: Request, res: Response) => {
  const result = await PoTransactionReceiptService.createReceipt(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'PO transaction receipt created successfully',
    data: result,
  });
});

const createLot = catchAsync(async (req: Request, res: Response) => {
  const result = await PoTransactionReceiptService.createLot(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'PO lot detail created successfully',
    data: result,
  });
});

const updateWithLots = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    id: Number(req.params.id),
    ...req.body,
  };
  const result = await PoTransactionReceiptService.updateReceiptWithLots(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO transaction receipt and lot details updated successfully',
    data: result,
  });
});

const updateReceipt = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await PoTransactionReceiptService.updateReceipt(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO transaction receipt updated successfully',
    data: result,
  });
});

const updateLot = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await PoTransactionReceiptService.updateLot(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO lot detail updated successfully',
    data: result,
  });
});

const getReceiptById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await PoTransactionReceiptService.getReceiptById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO transaction receipt retrieved successfully',
    data: result,
  });
});

const getLotById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await PoTransactionReceiptService.getLotById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO lot detail retrieved successfully',
    data: result,
  });
});

const listReceipts = catchAsync(async (req: Request, res: Response) => {
  const { po_header_id, interface_line_number, transaction_type, limit, offset } = req.query;
  const result = await PoTransactionReceiptService.listReceipts({
    po_header_id: po_header_id ? Number(po_header_id) : undefined,
    interface_line_number: interface_line_number as string | undefined,
    transaction_type: transaction_type as string | undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO transaction receipts retrieved successfully',
    data: result.data,
    meta: {
      page: 1,
      limit: limit ? Number(limit) : 20,
      total: result.total,
    },
  });
});

const deleteReceipt = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await PoTransactionReceiptService.deleteReceipt(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO transaction receipt deleted successfully',
  });
});

const deleteLot = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await PoTransactionReceiptService.deleteLot(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO lot detail deleted successfully',
  });
});

const downloadOracleExport = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { buffer, filename } = await PoTransactionReceiptService.generateOracleExport(id);
  res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const PoTransactionReceiptController = {
  createWithLots,
  createReceipt,
  createLot,
  updateWithLots,
  updateReceipt,
  updateLot,
  getReceiptById,
  getLotById,
  listReceipts,
  deleteReceipt,
  deleteLot,
  downloadOracleExport,
};

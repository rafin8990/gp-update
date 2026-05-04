import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { InboundService } from './inbound.service';

const scan = catchAsync(async (req: Request, res: Response) => {
  const result = await InboundService.recordScan(req.body);

  sendResponse(res, {
    statusCode: result.deduped ? httpStatus.OK : httpStatus.CREATED,
    success: true,
    message: result.deduped ? 'Duplicate scan ignored' : 'Inbound scan recorded successfully',
    data: result,
  });
});

const live = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const result = await InboundService.getLiveSummary(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound live summary retrieved successfully',
    data: result,
  });
});

const itemSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await InboundService.getItemWiseSummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound item summary retrieved successfully',
    data: result,
  });
});

const poSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await InboundService.getPoSummary(Number(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound PO summary retrieved successfully',
    data: result,
  });
});

const exportInbound = catchAsync(async (req: Request, res: Response) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const filters = {
    po_header_id: req.query.po_header_id ? Number(req.query.po_header_id) : undefined,
    epc: req.query.epc as string | undefined,
    location_id: req.query.location_id ? Number(req.query.location_id) : undefined,
    status: req.query.status as 'in' | 'out' | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  };

  const result = await InboundService.exportMovements(filters, format);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inbound-scans.csv"');
    res.status(httpStatus.OK).send(result);
    return;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound movements exported successfully',
    data: result as never,
  });
});

const list = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    epc: req.query.epc as string | undefined,
    po_header_id: req.query.po_header_id ? Number(req.query.po_header_id) : undefined,
    location_id: req.query.location_id ? Number(req.query.location_id) : undefined,
    status: req.query.status as 'in' | 'out' | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  };

  const result = await InboundService.listScans(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound scans retrieved successfully',
    data: result.data,
    meta: {
      page: 1,
      limit: filters.limit ?? 20,
      total: result.total,
    },
  });
});

export const InboundController = {
  scan,
  live,
  itemSummary,
  poSummary,
  export: exportInbound,
  list,
};

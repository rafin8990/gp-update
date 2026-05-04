import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { PurchaseOrderService } from './purchaseOrder.service';
import { PoLotReceiveService } from './poLotReceive.service';
import { parseExcelFile, parseCsvFile } from './purchaseOrder.fileParser';

const createWithLines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PurchaseOrderService.createPurchaseOrderWithLines(req.body);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Purchase order with lines created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PurchaseOrderService.createPurchaseOrder(req.body);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Purchase order created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createPurchaseOrderLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PurchaseOrderService.createPurchaseOrderLine(req.body);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Purchase order line created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateWithLines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = {
      po_header_id: Number(req.params.po_header_id),
      ...req.body,
    };

    const result = await PurchaseOrderService.updatePurchaseOrderWithLines(payload);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase order and lines updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_header_id = Number(req.params.po_header_id);
    const result = await PurchaseOrderService.updatePurchaseOrder(po_header_id, req.body);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePurchaseOrderLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_line_id = Number(req.params.po_line_id);
    const result = await PurchaseOrderService.updatePurchaseOrderLine(po_line_id, req.body);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase order line updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_header_id = Number(req.params.po_header_id);
    const result = await PurchaseOrderService.getPurchaseOrderById(po_header_id);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase order retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseOrderLineById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_line_id = Number(req.params.po_line_id);
    const result = await PurchaseOrderService.getPurchaseOrderLineById(po_line_id);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase order line retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status_code,
      supplier_id,
      po_number,
      limit,
      offset,
    } = req.query;

    const result = await PurchaseOrderService.listPurchaseOrders({
      status_code: status_code as string | undefined,
      supplier_id: supplier_id ? Number(supplier_id) : undefined,
      po_number: po_number as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deletePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_header_id = Number(req.params.po_header_id);
    await PurchaseOrderService.deletePurchaseOrder(po_header_id);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

const deletePurchaseOrderLine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_line_id = Number(req.params.po_line_id);
    await PurchaseOrderService.deletePurchaseOrderLine(po_line_id);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

const getLotReceiveSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_header_id = Number(req.params.po_header_id);
    const data = await PoLotReceiveService.getLotReceiveSummary(po_header_id);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Lot receive summary retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const approveLotReceive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const po_header_id = Number(req.params.po_header_id);
    const result = await PoLotReceiveService.approveLotReceive(po_header_id, {
      po_lot_detail_id: Number(req.body.po_lot_detail_id),
    });
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Lot receive approved and stock updated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const uploadPurchaseOrdersFromFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;

    if (!file) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    let parsedData;

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedData = await parseExcelFile(file.buffer);
    } else if (fileExtension === 'csv') {
      parsedData = await parseCsvFile(file.buffer);
    } else {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid file type. Only CSV and Excel files are supported',
      });
    }

    if (parsedData.length === 0) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No valid purchase orders found in the file',
      });
    }

    const result = await PurchaseOrderService.bulkCreatePurchaseOrdersFromFile(parsedData);

    const statusCode =
      result.failed === 0
        ? httpStatus.CREATED
        : result.success > 0
          ? httpStatus.MULTI_STATUS
          : httpStatus.BAD_REQUEST;

    res.status(statusCode).json({
      success: result.failed === 0,
      message:
        result.failed === 0
          ? `Successfully created ${result.success} purchase order(s)`
          : `Created ${result.success} purchase order(s), ${result.failed} failed`,
      data: {
        total: parsedData.length,
        success: result.success,
        failed: result.failed,
        results: result.results,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const PurchaseOrderController = {
  createWithLines,
  createPurchaseOrder,
  createPurchaseOrderLine,
  updateWithLines,
  updatePurchaseOrder,
  updatePurchaseOrderLine,
  getPurchaseOrderById,
  getPurchaseOrderLineById,
  listPurchaseOrders,
  deletePurchaseOrder,
  deletePurchaseOrderLine,
  uploadPurchaseOrdersFromFile,
  getLotReceiveSummary,
  approveLotReceive,
};


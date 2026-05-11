import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as PickSlipService from './pickSlip.service';

const fifoEpcs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item_number = String(req.query.item_number);
    const limit = req.query.limit ? Number(req.query.limit) : 500;
    const data = await PickSlipService.listFifoEpcsForItem(item_number, limit);
    res.status(httpStatus.OK).json({ success: true, message: 'FIFO EPCs', data });
  } catch (e) {
    next(e);
  }
};

const createPack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requisition_id, items } = req.body;
    const data = await PickSlipService.createPickSlipFromPackItems(requisition_id, items);
    res.status(httpStatus.CREATED).json({ success: true, message: 'Pick slip created', data });
  } catch (e) {
    next(e);
  }
};

const listPacks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PickSlipService.listPickSlipsAsPacks(req.query as any);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Pick slips',
      data: result.data,
      meta: result.meta,
    });
  } catch (e) {
    next(e);
  }
};

const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await PickSlipService.getPickSlipPackById(Number(req.params.id));
    if (!data) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Not found' });
    }
    res.status(httpStatus.OK).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const updatePack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await PickSlipService.updatePickSlipPack(Number(req.params.id), req.body);
    if (!data) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Not found' });
    }
    res.status(httpStatus.OK).json({ success: true, message: 'Updated', data });
  } catch (e) {
    next(e);
  }
};

const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await PickSlipService.deletePickSlip(Number(req.params.id));
    if (!ok) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Not found' });
    }
    res.status(httpStatus.OK).json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};

const exportXlsx = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buf = await PickSlipService.buildSalesOrderTransactionSheet(Number(req.params.id));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="pick-slip-${req.params.id}.xlsx"`);
    res.status(httpStatus.OK).send(buf);
  } catch (e) {
    next(e);
  }
};

export const PickSlipController = {
  fifoEpcs,
  createPack,
  listPacks,
  getById,
  updatePack,
  remove,
  exportXlsx,
};

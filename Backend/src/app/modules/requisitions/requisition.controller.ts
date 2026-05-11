import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as RequisitionService from './requisition.service';

const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RequisitionService.listRequisitions(req.query as any);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Requisitions retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (e) {
    next(e);
  }
};

const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await RequisitionService.getRequisitionById(id);
    if (!data) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Requisition not found' });
    }
    res.status(httpStatus.OK).json({ success: true, message: 'Requisition retrieved successfully', data });
  } catch (e) {
    next(e);
  }
};

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await RequisitionService.createRequisition(req.body);
    res.status(httpStatus.CREATED).json({ success: true, message: 'Requisition created successfully', data });
  } catch (e) {
    next(e);
  }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await RequisitionService.updateRequisition(id, req.body);
    if (!data) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Requisition not found' });
    }
    res.status(httpStatus.OK).json({ success: true, message: 'Requisition updated successfully', data });
  } catch (e) {
    next(e);
  }
};

const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const ok = await RequisitionService.deleteRequisition(id);
    if (!ok) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: 'Requisition not found' });
    }
    res.status(httpStatus.OK).json({ success: true, message: 'Requisition deleted successfully', data: null });
  } catch (e) {
    next(e);
  }
};

export const RequisitionController = { list, getById, create, update, remove };

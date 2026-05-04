import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { PoCodeService } from './poCode.service';

const createPoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PoCodeService.createPoCode(req.body);
    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'PO code created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updatePoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await PoCodeService.updatePoCode(id, req.body);
    
    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'PO code not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'PO code updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPoCodeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await PoCodeService.getPoCodeById(id);
    
    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'PO code not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'PO code retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listPoCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      po_header_id: req.query.po_header_id ? parseInt(req.query.po_header_id as string, 10) : undefined,
      item_id: req.query.item_id ? parseInt(req.query.item_id as string, 10) : undefined,
      rfid_code: req.query.rfid_code as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const result = await PoCodeService.listPoCodes(filters);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'PO codes retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deletePoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await PoCodeService.deletePoCode(id);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export const PoCodeController = {
  createPoCode,
  updatePoCode,
  getPoCodeById,
  listPoCodes,
  deletePoCode,
};

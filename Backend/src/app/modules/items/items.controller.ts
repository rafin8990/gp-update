import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { ItemsService } from './items.service';

const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ItemsService.createItem(req.body);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Item created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = Number(req.params.item);
    const result = await ItemsService.updateItem(item, req.body);

    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Item updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = Number(req.params.item);
    const result = await ItemsService.getItemById(item);

    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Item retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      inventory_organization,
      item_status,
      primary_uom_code,
      user_item_type,
      limit,
      offset,
    } = req.query;

    const result = await ItemsService.listItems({
      inventory_organization: inventory_organization as string | undefined,
      item_status: item_status as string | undefined,
      primary_uom_code: primary_uom_code as string | undefined,
      user_item_type: user_item_type as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Items retrieved successfully',
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

const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = Number(req.params.item);
    await ItemsService.deleteItem(item);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export const ItemsController = {
  createItem,
  updateItem,
  getItemById,
  listItems,
  deleteItem,
};

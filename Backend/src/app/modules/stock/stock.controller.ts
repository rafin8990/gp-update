import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { StockService } from './stock.service';

const listStocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StockService.listStocks({
      searchTerm: req.query.searchTerm as string | undefined,
      po_number: req.query.po_number as string | undefined,
      item_number: req.query.item_number as string | undefined,
      lot_no: req.query.lot_no as string | undefined,
    });
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Stock records retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getStockStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StockService.getStockStats();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Stock statistics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getStockSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StockService.getStockSummary();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Stock summary retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getLiveStockData = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StockService.getLiveStockData();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Live stock data retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getAggregatedStocks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StockService.getAggregatedStocks();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Aggregated stock retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getStockByPoItemLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { po_number, item_number, lot_no } = req.params;
    const data = await StockService.getStockByPoItemLot(po_number, item_number, lot_no);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Stock record retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const StockController = {
  listStocks,
  getStockStats,
  getStockSummary,
  getLiveStockData,
  getAggregatedStocks,
  getStockByPoItemLot,
};

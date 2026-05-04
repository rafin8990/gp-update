import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { StockController } from './stock.controller';
import { StockValidation } from './stock.validation';

const router = express.Router();

router.get('/stats', auth, StockController.getStockStats);
router.get('/summary', auth, StockController.getStockSummary);
router.get('/live', auth, StockController.getLiveStockData);
router.get('/aggregated', auth, StockController.getAggregatedStocks);
router.get(
  '/:po_number/:item_number/:lot_no',
  auth,
  validateRequest(StockValidation.getStockByTripleSchema),
  StockController.getStockByPoItemLot,
);
router.get(
  '/',
  auth,
  validateRequest(StockValidation.listStockQuerySchema),
  StockController.listStocks,
);

export const StockRoutes = router;

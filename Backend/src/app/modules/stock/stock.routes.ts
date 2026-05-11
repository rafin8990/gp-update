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
  '/inbound-scans/by-po/:po_number',
  auth,
  validateRequest(StockValidation.listInboundScansByPoSchema),
  StockController.listInboundScansByPoNumber,
);
router.get(
  '/:po_number/:item_number/:lot_no/inbound-scans',
  auth,
  validateRequest(StockValidation.getStockByTripleSchema),
  StockController.listInboundScansForStockLine,
);
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

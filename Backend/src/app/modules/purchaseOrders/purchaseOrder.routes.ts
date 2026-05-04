import express from 'express';
import { PurchaseOrderController } from './purchaseOrder.controller';
import { PurchaseOrderValidation } from './purchaseOrder.validation';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload';

const router = express.Router();

// Upload purchase orders from CSV/Excel file
router.post(
  '/upload',
  auth,
  upload.single('file'),
  PurchaseOrderController.uploadPurchaseOrdersFromFile
);

// Create PO + lines together
router.post(
  '/with-lines',
  auth,
  validateRequest(PurchaseOrderValidation.createPurchaseOrderWithLinesSchema),
  PurchaseOrderController.createWithLines
);

// Create PO only
router.post(
  '/',
  auth,
  validateRequest(PurchaseOrderValidation.createPurchaseOrderSchema),
  PurchaseOrderController.createPurchaseOrder
);

// Create PO line only
router.post(
  '/lines',
  auth,
  validateRequest(PurchaseOrderValidation.createPurchaseOrderLineSchema),
  PurchaseOrderController.createPurchaseOrderLine
);

// Update PO + lines together
router.put(
  '/:po_header_id/with-lines',
  auth,
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderWithLinesSchema),
  PurchaseOrderController.updateWithLines
);

// Update PO only
router.put(
  '/:po_header_id',
  auth,
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderSchema),
  PurchaseOrderController.updatePurchaseOrder
);

// Update PO line only
router.put(
  '/lines/:po_line_id',
  auth,
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderLineSchema),
  PurchaseOrderController.updatePurchaseOrderLine
);

// Lot receive (receipt-driven FIFO) + approve to stock
router.get(
  '/:po_header_id/lot-receive-summary',
  auth,
  validateRequest(PurchaseOrderValidation.getLotReceiveSummarySchema),
  PurchaseOrderController.getLotReceiveSummary
);
router.post(
  '/:po_header_id/approve-lot-receive',
  auth,
  validateRequest(PurchaseOrderValidation.approveLotReceiveSchema),
  PurchaseOrderController.approveLotReceive
);

// Get PO (with lines)
router.get(
  '/:po_header_id',
  auth,
  PurchaseOrderController.getPurchaseOrderById
);

// Get PO line
router.get(
  '/lines/:po_line_id',
  auth,
  PurchaseOrderController.getPurchaseOrderLineById
);

// List POs
router.get(
  '/',
  auth,
  PurchaseOrderController.listPurchaseOrders
);

// Delete PO (will cascade lines because of FK)
router.delete(
  '/:po_header_id',
  auth,
  PurchaseOrderController.deletePurchaseOrder
);

// Delete PO line
router.delete(
  '/lines/:po_line_id',
  auth,
  PurchaseOrderController.deletePurchaseOrderLine
);

export const PurchaseOrderRoutes = router;


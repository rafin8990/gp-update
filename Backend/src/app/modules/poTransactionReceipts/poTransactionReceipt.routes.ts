import express from 'express';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PoTransactionReceiptController } from './poTransactionReceipt.controller';
import { PoTransactionReceiptValidation } from './poTransactionReceipt.validation';

const router = express.Router();

router.post(
  '/with-lots',
  auth,
  validateRequest(PoTransactionReceiptValidation.createReceiptWithLotsSchema),
  PoTransactionReceiptController.createWithLots,
);

router.post(
  '/',
  auth,
  validateRequest(PoTransactionReceiptValidation.createReceiptSchema),
  PoTransactionReceiptController.createReceipt,
);

router.post(
  '/lots',
  auth,
  validateRequest(PoTransactionReceiptValidation.createLotSchema),
  PoTransactionReceiptController.createLot,
);

router.put(
  '/:id/with-lots',
  auth,
  validateRequest(PoTransactionReceiptValidation.updateReceiptWithLotsSchema),
  PoTransactionReceiptController.updateWithLots,
);

router.put(
  '/:id',
  auth,
  validateRequest(PoTransactionReceiptValidation.updateReceiptSchema),
  PoTransactionReceiptController.updateReceipt,
);

router.put(
  '/lots/:id',
  auth,
  validateRequest(PoTransactionReceiptValidation.updateLotSchema),
  PoTransactionReceiptController.updateLot,
);

router.get(
  '/:id',
  auth,
  validateRequest(PoTransactionReceiptValidation.getReceiptByIdSchema),
  PoTransactionReceiptController.getReceiptById,
);

router.get(
  '/lots/:id',
  auth,
  validateRequest(PoTransactionReceiptValidation.getLotByIdSchema),
  PoTransactionReceiptController.getLotById,
);

router.get(
  '/',
  auth,
  validateRequest(PoTransactionReceiptValidation.listReceiptsQuerySchema),
  PoTransactionReceiptController.listReceipts,
);

router.delete('/:id', auth, PoTransactionReceiptController.deleteReceipt);
router.delete('/lots/:id', auth, PoTransactionReceiptController.deleteLot);

export const PoTransactionReceiptRoutes = router;

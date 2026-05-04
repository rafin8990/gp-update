import express from 'express';
import { PoCodeController } from './poCode.controller';
import { PoCodeValidation } from './poCode.validation';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';

const router = express.Router();

// Create po_code
router.post(
  '/',
  auth,
  validateRequest(PoCodeValidation.createPoCodeSchema),
  PoCodeController.createPoCode
);

// Update po_code
router.put(
  '/:id',
  auth,
  validateRequest(PoCodeValidation.updatePoCodeSchema),
  PoCodeController.updatePoCode
);

// Get po_code by ID
router.get(
  '/:id',
  auth,
  validateRequest(PoCodeValidation.getPoCodeByIdSchema),
  PoCodeController.getPoCodeById
);

// List po_codes
router.get(
  '/',
  auth,
  validateRequest(PoCodeValidation.listPoCodesQuerySchema),
  PoCodeController.listPoCodes
);

// Delete po_code
router.delete(
  '/:id',
  auth,
  validateRequest(PoCodeValidation.deletePoCodeSchema),
  PoCodeController.deletePoCode
);

export const PoCodeRoutes = router;

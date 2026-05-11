import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { PickSlipValidation } from './pickSlip.validation';
import { PickSlipController } from './pickSlip.controller';

const router = express.Router();

router.get(
  '/fifo-epcs',
  auth,
  validateRequest(PickSlipValidation.fifoEpcs),
  PickSlipController.fifoEpcs,
);
router.get(
  '/:id/export',
  auth,
  validateRequest(PickSlipValidation.export),
  PickSlipController.exportXlsx,
);
router.get('/', auth, validateRequest(PickSlipValidation.listPacks), PickSlipController.listPacks);
router.post('/', auth, validateRequest(PickSlipValidation.createPack), PickSlipController.createPack);
router.get('/:id', auth, validateRequest(PickSlipValidation.getById), PickSlipController.getById);
router.patch('/:id', auth, validateRequest(PickSlipValidation.updatePack), PickSlipController.updatePack);
router.delete('/:id', auth, validateRequest(PickSlipValidation.delete), PickSlipController.remove);

export const PickSlipRoutes = router;

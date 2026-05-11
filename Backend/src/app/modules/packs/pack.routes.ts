/**
 * Legacy /packs path — same handlers as pick-slips (Pick Item UI).
 */
import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { PickSlipValidation } from '../pickSlips/pickSlip.validation';
import { PickSlipController } from '../pickSlips/pickSlip.controller';

const router = express.Router();

router.get('/', auth, validateRequest(PickSlipValidation.listPacks), PickSlipController.listPacks);
router.post('/', auth, validateRequest(PickSlipValidation.createPack), PickSlipController.createPack);
router.get('/:id', auth, validateRequest(PickSlipValidation.getById), PickSlipController.getById);
router.patch('/:id', auth, validateRequest(PickSlipValidation.updatePack), PickSlipController.updatePack);
router.delete('/:id', auth, validateRequest(PickSlipValidation.delete), PickSlipController.remove);

export const PackRoutes = router;

import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { RequisitionValidation } from './requisition.validation';
import { RequisitionController } from './requisition.controller';

const router = express.Router();

router.get('/', auth, validateRequest(RequisitionValidation.list), RequisitionController.list);
router.post('/', auth, validateRequest(RequisitionValidation.create), RequisitionController.create);
router.get('/:id', auth, validateRequest(RequisitionValidation.getById), RequisitionController.getById);
router.patch('/:id', auth, validateRequest(RequisitionValidation.update), RequisitionController.update);
router.delete('/:id', auth, validateRequest(RequisitionValidation.delete), RequisitionController.remove);

export const RequisitionRoutes = router;

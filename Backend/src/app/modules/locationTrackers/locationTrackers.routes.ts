import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { LocationTrackersController } from './locationTrackers.controller';
import { LocationTrackersValidation } from './locationTrackers.validation';

const router = express.Router();

router.get('/stats', auth, LocationTrackersController.stats);
router.get('/current-status', auth, LocationTrackersController.currentStatus);
router.get(
  '/location/:locationCode',
  auth,
  validateRequest(LocationTrackersValidation.locationCodeParamSchema),
  LocationTrackersController.byLocation,
);
router.get(
  '/',
  auth,
  validateRequest(LocationTrackersValidation.listQuerySchema),
  LocationTrackersController.list,
);

export const LocationTrackersRoutes = router;

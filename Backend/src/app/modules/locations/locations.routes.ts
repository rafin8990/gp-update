import express from 'express';
import { LocationsController } from './locations.controller';
import { LocationsValidation } from './locations.validation';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';

const router = express.Router();

// Create location
router.post(
  '/',
  auth,
  validateRequest(LocationsValidation.createLocationSchema),
  LocationsController.createLocation
);

// Update location
router.put(
  '/:id',
  auth,
  validateRequest(LocationsValidation.updateLocationSchema),
  LocationsController.updateLocation
);

// Get location by ID
router.get(
  '/:id',
  auth,
  validateRequest(LocationsValidation.getLocationByIdSchema),
  LocationsController.getLocationById
);

// List locations
router.get(
  '/',
  auth,
  validateRequest(LocationsValidation.listLocationsQuerySchema),
  LocationsController.listLocations
);

// Delete location
router.delete(
  '/:id',
  auth,
  validateRequest(LocationsValidation.deleteLocationSchema),
  LocationsController.deleteLocation
);

export const LocationsRoutes = router;

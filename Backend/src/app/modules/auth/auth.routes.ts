import express from 'express';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

// Public routes
router.post(
  '/register',
  validateRequest(AuthValidation.registerValidationSchema),
  AuthController.register
);

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login
);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken
);

// Protected routes
router.get(
  '/profile',
  auth,
  AuthController.getProfile
);

export const AuthRoutes = router;

import { Router } from 'express';
import { UsersController } from './users.controller';
import UsersValidation from './users.validation';
import validateRequest from '../../middlewares/validateRequest';


const router = Router();

// List users (admin/super_admin)
router.get(
  '/',
  validateRequest(UsersValidation.getAll),
  UsersController.getAll
);

// Update user (admin/super_admin)
router.patch(
  '/:id',
  validateRequest(UsersValidation.update),
  UsersController.update
);

export const UserRoutes = router;
export default UserRoutes;


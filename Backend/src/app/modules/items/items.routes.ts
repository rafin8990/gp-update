import express from 'express';
import { ItemsController } from './items.controller';
import { ItemsValidation } from './items.validation';
import validateRequest from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';

const router = express.Router();

// Create item
router.post(
  '/',
  auth,
  validateRequest(ItemsValidation.createItemSchema),
  ItemsController.createItem
);

// Update item
router.put(
  '/:item',
  auth,
  validateRequest(ItemsValidation.updateItemSchema),
  ItemsController.updateItem
);

// Get item by ID
router.get(
  '/:item',
  auth,
  validateRequest(ItemsValidation.getItemByIdSchema),
  ItemsController.getItemById
);

// List items
router.get(
  '/',
  auth,
  validateRequest(ItemsValidation.listItemsQuerySchema),
  ItemsController.listItems
);

// Delete item
router.delete(
  '/:item',
  auth,
  validateRequest(ItemsValidation.deleteItemSchema),
  ItemsController.deleteItem
);

export const ItemsRoutes = router;

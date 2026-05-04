import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { InboundController } from './inbound.controller';
import { InboundValidation } from './inbound.validation';

const router = express.Router();

router.post('/scan', validateRequest(InboundValidation.scanSchema), InboundController.scan);
router.get('/live', validateRequest(InboundValidation.liveQuerySchema), InboundController.live);
router.get(
  '/item-summary',
  validateRequest(InboundValidation.itemSummaryQuerySchema),
  InboundController.itemSummary,
);
router.get(
  '/po/:id/summary',
  validateRequest(InboundValidation.poSummarySchema),
  InboundController.poSummary,
);
router.get('/export', validateRequest(InboundValidation.exportQuerySchema), InboundController.export);
router.get('/', validateRequest(InboundValidation.listScansQuerySchema), InboundController.list);

export const InboundRoutes = router;

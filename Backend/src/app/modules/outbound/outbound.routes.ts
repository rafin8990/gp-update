import express from 'express';
import httpStatus from 'http-status';
import { auth } from '../../middlewares/auth';

const router = express.Router();

/** Minimal list for outbound live UI until full outbound persistence exists */
router.get('/', auth, async (_req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Outbound list (empty placeholder)',
    data: [],
  });
});

export const OutboundRoutes = router;

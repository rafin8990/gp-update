import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/users/users.routes';
import { PurchaseOrderRoutes } from '../modules/purchaseOrders/purchaseOrder.routes';
import { ItemsRoutes } from '../modules/items/items.routes';
import { LocationsRoutes } from '../modules/locations/locations.routes';
import { InboundRoutes } from '../modules/inbound/inbound.route';
import { PoCodeRoutes } from '../modules/poCodes/poCode.routes';
import { PoTransactionReceiptRoutes } from '../modules/poTransactionReceipts/poTransactionReceipt.routes';
import { StockRoutes } from '../modules/stock/stock.routes';
import { LocationTrackersRoutes } from '../modules/locationTrackers/locationTrackers.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    routes: AuthRoutes,
  },
  {
    path: '/users',
    routes: UserRoutes,
  },
  {
    path: '/purchase-orders',
    routes: PurchaseOrderRoutes,
  },
  {
    path: '/items',
    routes: ItemsRoutes,
  },
  {
    path: '/locations',
    routes: LocationsRoutes,
  },
  {
    path: '/inbound',
    routes: InboundRoutes,
  },
  {
    path: '/po-codes',
    routes: PoCodeRoutes,
  },
  {
    path: '/po-transaction-receipts',
    routes: PoTransactionReceiptRoutes,
  },
  {
    path: '/stock',
    routes: StockRoutes,
  },
  {
    path: '/location-trackers',
    routes: LocationTrackersRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;

import { z } from 'zod';

const listStockQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    po_number: z.string().optional(),
    item_number: z.string().optional(),
    lot_no: z.string().optional(),
  }),
});

const getStockByTripleSchema = z.object({
  params: z.object({
    po_number: z.string(),
    item_number: z.string(),
    lot_no: z.string(),
  }),
});

export const StockValidation = {
  listStockQuerySchema,
  getStockByTripleSchema,
};

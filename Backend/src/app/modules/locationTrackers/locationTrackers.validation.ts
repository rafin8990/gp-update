import { z } from 'zod';

const listQuerySchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    epc: z.string().optional(),
    location_code: z.string().optional(),
    po_number: z.string().optional(),
    item_number: z.string().optional(),
    status: z.enum(['in', 'out']).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const locationCodeParamSchema = z.object({
  params: z.object({
    locationCode: z.string().min(1),
  }),
});

const bulkDeleteBodySchema = z.object({
  body: z.object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
  }),
});

export const LocationTrackersValidation = {
  listQuerySchema,
  locationCodeParamSchema,
  bulkDeleteBodySchema,
};

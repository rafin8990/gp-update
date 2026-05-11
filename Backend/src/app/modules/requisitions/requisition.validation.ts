import { z } from 'zod';

const requisitionStatus = z.enum(['pending', 'complete', 'cancel', 'received']);

const lineSchema = z.object({
  item_number: z.string().min(1),
  item_type: z.string().optional(),
  quantity: z.coerce.number().positive(),
  uom: z.string().optional(),
  source_subinventory: z.string().optional(),
  source_location_code: z.string().optional(),
});

const createBody = z.object({
  requisition_number: z.string().min(1),
  source_order: z.string().optional(),
  distribution_partner_name: z.string().default(''),
  address: z.string().default(''),
  organization_code: z.string().default(''),
  description: z.string().nullable().optional(),
  status: requisitionStatus.optional(),
  transport_type_1: z.string().optional(),
  transport_type_2: z.string().optional(),
  vehicle_1: z.string().optional(),
  vehicle_2: z.string().optional(),
  items: z.array(lineSchema).min(1),
});

const updateBody = createBody.partial().extend({
  items: z.array(lineSchema).optional(),
  /** Allow explicit null to clear optional DB columns */
  source_order: z.union([z.string(), z.null()]).optional(),
  transport_type_1: z.union([z.string(), z.null()]).optional(),
  transport_type_2: z.union([z.string(), z.null()]).optional(),
  vehicle_1: z.union([z.string(), z.null()]).optional(),
  vehicle_2: z.union([z.string(), z.null()]).optional(),
});

export const RequisitionValidation = {
  create: z.object({ body: createBody }),
  update: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: updateBody,
  }),
  getById: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
  }),
  delete: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
  }),
  list: z.object({
    query: z.object({
      searchTerm: z.string().optional(),
      requisition_number: z.string().optional(),
      distribution_partner_name: z.string().optional(),
      organization_code: z.string().optional(),
      status: requisitionStatus.optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  }),
};

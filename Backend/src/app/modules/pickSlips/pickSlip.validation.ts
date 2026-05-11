import { z } from 'zod';

const packItem = z.object({
  item_number: z.string().min(1),
  epc: z.string().min(1),
});

export const PickSlipValidation = {
  fifoEpcs: z.object({
    query: z.object({
      item_number: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(2000).optional(),
    }),
  }),
  createPack: z.object({
    body: z.object({
      requisition_id: z.coerce.number().int().positive(),
      items: z.array(packItem).min(1),
    }),
  }),
  updatePack: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: z.object({
      requisition_id: z.coerce.number().int().positive().optional(),
      items: z.array(packItem).min(1),
    }),
  }),
  getById: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
  }),
  delete: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
  }),
  export: z.object({
    params: z.object({ id: z.coerce.number().int().positive() }),
  }),
  listPacks: z.object({
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      requisition_id: z.coerce.number().optional(),
      item_number: z.string().optional(),
      epc: z.string().optional(),
    }),
  }),
};

import { z } from 'zod';

// Base body schema for po_code
const basePoCodeBodySchema = z.object({
  po_header_id: z.number().int(),
  item_id: z.number().int(),
  rfid_code: z.string().max(255).optional(), // Optional - will be auto-generated if not provided
  serial_start: z.union([z.string(), z.number().int()]).nullable().optional(),
  serial_end: z.union([z.string(), z.number().int()]).nullable().optional(),
  quantity: z.number().int().nullable().optional(),
});

// POST /po-codes
const createPoCodeSchema = z.object({
  body: basePoCodeBodySchema,
});

// PUT /po-codes/:id
const updatePoCodeSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: basePoCodeBodySchema.partial(),
});

// GET /po-codes/:id
const getPoCodeByIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// GET /po-codes
const listPoCodesQuerySchema = z.object({
  query: z.object({
    po_header_id: z.string().optional(),
    item_id: z.string().optional(),
    rfid_code: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

// DELETE /po-codes/:id
const deletePoCodeSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const PoCodeValidation = {
  createPoCodeSchema,
  updatePoCodeSchema,
  getPoCodeByIdSchema,
  listPoCodesQuerySchema,
  deletePoCodeSchema,
};

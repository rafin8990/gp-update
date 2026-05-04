import { z } from 'zod';

const baseReceiptBodySchema = z.object({
  po_header_id: z.number().int().positive(),
  interface_line_number: z.string().max(30).optional(),
  transaction_type: z.string().max(100).optional(),
  transaction_date: z.string().nullable().optional(),
  source_document_code: z.string().max(50).nullable().optional(),
  receipt_source_code: z.string().max(50).nullable().optional(),
  header_interface_number: z.string().max(30).nullable().optional(),
  parent_transaction_id: z.string().max(30).nullable().optional(),
  organization_code: z.string().max(100).nullable().optional(),
  document_number: z.string().max(100).nullable().optional(),
  document_line_number: z.string().max(100).nullable().optional(),
  document_schedule_number: z.string().max(100).nullable().optional(),
  business_unit: z.string().max(100).nullable().optional(),
  sub_inventory: z.string().max(100).nullable().optional(),
  uom: z.string().max(80).nullable().optional(),
});

const baseLotBodySchema = z.object({
  po_header_id: z.number().int().positive(),
  interface_line_number: z.string().max(30),
  item_number: z.number().int().positive(),
  lot_number: z.string().max(100),
  transaction_quantity: z.number(),
  expired_date: z.string().nullable().optional(),
});

const createReceiptWithLotsSchema = z.object({
  body: z.object({
    receipt: baseReceiptBodySchema.extend({
      po_header_id: z.number().int().positive(),
    }),
    lots: z.array(
      baseLotBodySchema.extend({
        interface_line_number: z.string().max(30).optional(),
      }),
    ).min(1),
  }),
});

const createReceiptSchema = z.object({
  body: baseReceiptBodySchema.extend({
    po_header_id: z.number().int().positive(),
  }),
});

const createLotSchema = z.object({
  body: baseLotBodySchema,
});

const updateReceiptWithLotsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    receipt: baseReceiptBodySchema.partial(),
    lots: z.array(
      baseLotBodySchema.partial().extend({
        id: z.number().int().optional(),
        _action: z.enum(['create', 'update', 'delete']).optional(),
      }),
    ).optional(),
  }),
});

const updateReceiptSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: baseReceiptBodySchema.partial(),
});

const updateLotSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: baseLotBodySchema.partial(),
});

const getReceiptByIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const getLotByIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const listReceiptsQuerySchema = z.object({
  query: z.object({
    po_header_id: z.string().optional(),
    interface_line_number: z.string().optional(),
    transaction_type: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

export const PoTransactionReceiptValidation = {
  createReceiptWithLotsSchema,
  createReceiptSchema,
  createLotSchema,
  updateReceiptWithLotsSchema,
  updateReceiptSchema,
  updateLotSchema,
  getReceiptByIdSchema,
  getLotByIdSchema,
  listReceiptsQuerySchema,
};

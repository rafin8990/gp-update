import { z } from 'zod';

// Base bodies (used inside { body: ... })
const basePurchaseOrderBodySchema = z.object({
  po_header_id: z.number().int().optional(),
  po_number: z.string().max(30).optional(),
  status_code: z.string().max(20).optional(),
  status_name: z.string().max(50).nullable().optional(),
  order_status: z.enum(['pending', 'partially_received', 'full_received']).optional(),
  procurement_bu_id: z.number().int().nullable().optional(),
  procurement_bu_name: z.string().max(200).nullable().optional(),
  supplier_id: z.number().int().nullable().optional(),
  supplier_name: z.string().max(200).nullable().optional(),
  supplier_site_id: z.number().int().nullable().optional(),
  supplier_site_code: z.string().max(50).nullable().optional(),
  buyer_id: z.number().int().nullable().optional(),
  buyer_name: z.string().max(200).nullable().optional(),
  ship_to_location_id: z.number().int().nullable().optional(),
  ship_to_location_code: z.string().max(100).nullable().optional(),
  ship_to_address: z.string().nullable().optional(),
  currency_code: z.string().max(10).nullable().optional(),
  ordered_amount: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  order_date: z.string().nullable().optional(),
  source_system: z.string().max(50).nullable().optional(),
  raw_payload: z.any().optional(),
});

const basePurchaseOrderLineBodySchema = z.object({
  po_line_id: z.number().int().optional(),
  po_header_id: z.number().int().optional(),
  line_number: z.number().int().optional(),
  line_status_code: z.string().max(20).optional(),
  line_status_name: z.string().max(50).nullable().optional(),
  line_type: z.string().max(50).nullable().optional(),
  item_id: z.number().int().nullable().optional(),
  item_code: z.string().max(100).nullable().optional(),
  item_description: z.string().nullable().optional(),
  category_code: z.string().max(100).nullable().optional(),
  uom_code: z.string().max(20).nullable().optional(),
  uom_name: z.string().max(50).nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  currency_code: z.string().max(10).nullable().optional(),
  line_amount: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  serial_start: z.string().max(255).nullable().optional(),
  serial_end: z.string().max(255).nullable().optional(),
  raw_payload: z.any().optional(),
});

const createPurchaseOrderLineBodySchema = basePurchaseOrderLineBodySchema.omit({
  serial_start: true,
  serial_end: true,
});

// POST /purchase-orders/with-lines
const createPurchaseOrderWithLinesSchema = z.object({
  body: z.object({
    po: basePurchaseOrderBodySchema.extend({
      po_header_id: z.number().int(),
      po_number: z.string().max(30),
      status_code: z.string().max(20),
    }),
    lines: z.array(
      createPurchaseOrderLineBodySchema.extend({
        po_line_id: z.number().int(),
        po_header_id: z.number().int().optional(), // Allow po_header_id but it's optional since it comes from the parent
        line_number: z.number().int(),
        line_status_code: z.string().max(20),
      })
    ).min(1),
  }),
});

// POST /purchase-orders
const createPurchaseOrderSchema = z.object({
  body: basePurchaseOrderBodySchema.extend({
    po_header_id: z.number().int(),
    po_number: z.string().max(30),
    status_code: z.string().max(20),
  }),
});

// POST /purchase-orders/lines
const createPurchaseOrderLineSchema = z.object({
  body: createPurchaseOrderLineBodySchema.extend({
    po_line_id: z.number().int(),
    po_header_id: z.number().int(),
    line_number: z.number().int(),
    line_status_code: z.string().max(20),
  }),
});

// PUT /purchase-orders/:po_header_id
const updatePurchaseOrderSchema = z.object({
  params: z.object({
    po_header_id: z.string(),
  }),
  body: basePurchaseOrderBodySchema,
});

// PUT /purchase-orders/:po_header_id/with-lines
const updatePurchaseOrderWithLinesSchema = z.object({
  params: z.object({
    po_header_id: z.string(),
  }),
  body: z.object({
    po: basePurchaseOrderBodySchema,
    lines: z.array(
      basePurchaseOrderLineBodySchema.extend({
        _action: z.enum(['create', 'update', 'delete']).optional(),
        po_line_id: z.number().int().optional(),
      })
    ).optional(),
  }),
});

// PUT /purchase-orders/lines/:po_line_id
const updatePurchaseOrderLineSchema = z.object({
  params: z.object({
    po_line_id: z.string(),
  }),
  body: basePurchaseOrderLineBodySchema,
});

// GET /purchase-orders/:po_header_id
const getPurchaseOrderByIdSchema = z.object({
  params: z.object({
    po_header_id: z.string(),
  }),
});

// GET /purchase-orders/lines/:po_line_id
const getPurchaseOrderLineByIdSchema = z.object({
  params: z.object({
    po_line_id: z.string(),
  }),
});

// GET /purchase-orders
const listPurchaseOrdersQuerySchema = z.object({
  query: z.object({
    status_code: z.string().max(20).optional(),
    supplier_id: z.string().optional(),
    po_number: z.string().max(30).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

const getLotReceiveSummarySchema = z.object({
  params: z.object({
    po_header_id: z.string(),
  }),
});

const approveLotReceiveSchema = z.object({
  params: z.object({
    po_header_id: z.string(),
  }),
  body: z.object({
    po_lot_detail_id: z.coerce.number().int().positive(),
  }),
});

export const PurchaseOrderValidation = {
  createPurchaseOrderWithLinesSchema,
  createPurchaseOrderSchema,
  createPurchaseOrderLineSchema,
  updatePurchaseOrderSchema,
  updatePurchaseOrderWithLinesSchema,
  updatePurchaseOrderLineSchema,
  getPurchaseOrderByIdSchema,
  getPurchaseOrderLineByIdSchema,
  listPurchaseOrdersQuerySchema,
  getLotReceiveSummarySchema,
  approveLotReceiveSchema,
};


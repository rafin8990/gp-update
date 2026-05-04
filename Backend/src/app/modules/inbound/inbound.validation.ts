import { z } from 'zod';

const scanSchema = z.object({
  body: z.object({
    epc: z.string().min(1),
    rssi: z.union([z.string(), z.number()]).optional(),
    deviceId: z.string().optional(),
    value: z.union([z.number(), z.string()]).optional(),
    timestamp: z.union([z.number(), z.string()]).optional(),
  }),
});

const liveQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

const itemSummaryQuerySchema = z.object({
  query: z.object({}),
});

const poSummarySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const exportQuerySchema = z.object({
  query: z.object({
    po_header_id: z.string().optional(),
    epc: z.string().optional(),
    location_id: z.string().optional(),
    status: z.enum(['in', 'out']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    format: z.enum(['json', 'csv']).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

const listScansQuerySchema = z.object({
  query: z.object({
    epc: z.string().optional(),
    po_header_id: z.string().optional(),
    location_id: z.string().optional(),
    status: z.enum(['in', 'out']).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

export const InboundValidation = {
  scanSchema,
  liveQuerySchema,
  itemSummaryQuerySchema,
  poSummarySchema,
  exportQuerySchema,
  listScansQuerySchema,
};

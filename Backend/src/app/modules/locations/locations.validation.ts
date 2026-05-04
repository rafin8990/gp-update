import { z } from 'zod';

// Base body schema for location
const baseLocationBodySchema = z.object({
  name: z.string().min(1).max(255),
  location_code: z.string().max(100).nullable().optional(),
});

// POST /locations
const createLocationSchema = z.object({
  body: baseLocationBodySchema,
});

// PUT /locations/:id
const updateLocationSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: baseLocationBodySchema.partial(),
});

// GET /locations/:id
const getLocationByIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// GET /locations
const listLocationsQuerySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    location_code: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});

// DELETE /locations/:id
const deleteLocationSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const LocationsValidation = {
  createLocationSchema,
  updateLocationSchema,
  getLocationByIdSchema,
  listLocationsQuerySchema,
  deleteLocationSchema,
};

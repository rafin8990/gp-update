import { z } from 'zod';

export const UsersValidation = {
  getAll: z.object({
    query: z.object({
      search: z.string().optional(),
      limit: z.string().optional(),
      page: z.string().optional(),
    }).optional(),
  }),

  update: z.object({
    params: z.object({ id: z.string() }),
    body: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile_no: z.string().optional(),
      role: z.string().optional(),
      password: z.string().min(6).optional(),
    }).refine(data => Object.keys(data).length > 0, { message: 'No fields to update' }),
  }),
};

export default UsersValidation;


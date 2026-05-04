import { z } from 'zod';

const loginValidationSchema = z.object({
  body: z.object({
    username: z.string({
      required_error: 'Username is required',
    }).min(1, 'Username cannot be empty'),
    password: z.string({
      required_error: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),
  }),
});

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }).min(2, 'Name must be at least 2 characters'),
    username: z.string({
      required_error: 'Username is required',
    }).min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email format').optional(),
    mobile_no: z.string().optional(),
    password: z.string({
      required_error: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),
    role: z.string().optional(),
  }),
});

const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required',
    }),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  registerValidationSchema,
  refreshTokenValidationSchema,
};

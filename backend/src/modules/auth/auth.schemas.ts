import { z } from 'zod';

export const emailSchema = z
  .string({ required_error: 'email is required' })
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(254, 'Email is too long');

export const passwordSchema = z
  .string({ required_error: 'password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const verifyOtpBodySchema = z.object({
  email: emailSchema,
  code: z.string({ required_error: 'code is required' }).regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

export const resendOtpBodySchema = z.object({
  email: emailSchema,
  pendingToken: z.string().min(1).optional(),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
});

export const loginVerifyBodySchema = z.object({
  pendingToken: z.string({ required_error: 'pendingToken is required' }).min(1, 'pendingToken is required'),
  code: z.string({ required_error: 'code is required' }).regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type LoginVerifyBody = z.infer<typeof loginVerifyBodySchema>;

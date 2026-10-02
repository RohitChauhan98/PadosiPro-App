import type { ZodType } from 'zod';
import { AppError } from './errors.js';

/** Validates an unknown payload with zod and throws the contract's VALIDATION_ERROR envelope on failure. */
export function parseWith<T>(schema: ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw AppError.validation(
      'Request body failed validation',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    );
  }
  return result.data;
}

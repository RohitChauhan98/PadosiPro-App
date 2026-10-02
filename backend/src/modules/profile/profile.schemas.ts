import { z } from 'zod';

export const INDIAN_MOBILE_REGEX = /^\+91[6-9]\d{9}$/;

/**
 * Accepts 9876543210, 919876543210 or +919876543210 (spaces/hyphens tolerated)
 * and normalizes to +91XXXXXXXXXX.
 */
export function normalizeIndianMobile(raw: string): string {
  const compact = raw.replace(/[\s-]/g, '');
  let national: string;
  if (compact.startsWith('+91')) {
    national = compact.slice(3);
  } else if (compact.startsWith('91') && compact.length === 12) {
    national = compact.slice(2);
  } else {
    national = compact;
  }
  return `+91${national}`;
}

export const mobileNumberSchema = z
  .string({ required_error: 'mobileNumber is required' })
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(INDIAN_MOBILE_REGEX, 'mobileNumber must be a valid Indian mobile number'));

export const upsertProfileBodySchema = z.object({
  name: z.string({ required_error: 'name is required' }).trim().min(1, 'name is required').max(100, 'name must be at most 100 characters'),
  mobileNumber: mobileNumberSchema,
  address: z.string({ required_error: 'address is required' }).trim().min(1, 'address is required').max(500, 'address must be at most 500 characters'),
  // Optional: PadosiPro serves households first, so not every user has a business.
  businessName: z
    .string()
    .trim()
    .max(100, 'businessName must be at most 100 characters')
    .nullish()
    .transform((value) => (value == null || value === '' ? null : value)),
});

export type UpsertProfileBody = z.infer<typeof upsertProfileBodySchema>;

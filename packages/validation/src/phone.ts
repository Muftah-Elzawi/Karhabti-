import { z } from 'zod';

/**
 * Libyan mobile number in local format, e.g. 0912345678.
 * Prefixes 091–095 cover Al-Madar and Libyana ranges.
 * TODO: confirm the exact live prefix list with the operations partner.
 */
export const libyanPhoneSchema = z
  .string()
  .regex(/^09[1-5]\d{7}$/, { message: 'invalid_libyan_phone' });

export type LibyanPhone = z.infer<typeof libyanPhoneSchema>;

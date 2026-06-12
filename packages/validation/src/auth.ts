import { z } from 'zod';

import { libyanPhoneSchema } from './phone';

/** Shared auth input contracts — used by the API and the web auth screens. */

export const registerSchema = z.object({
  phone: libyanPhoneSchema,
  // Messages are stable i18n keys — clients map them to localized copy.
  password: z.string().min(8, 'password_too_short').max(72),
  displayName: z.string().trim().min(2, 'displayName_too_short').max(50),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'invalid_email' })
  .max(254);

/** Login accepts a Libyan phone OR an email address. */
export const loginIdentifierSchema = z.union([libyanPhoneSchema, emailSchema], {
  errorMap: () => ({ message: 'invalid_identifier' }),
});

export const loginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2, 'displayName_too_short').max(50).optional(),
    // TODO: email ownership verification (magic link) before launch — for now
    // email only enables login and is uniqueness-checked.
    email: emailSchema.optional(),
    locale: z.enum(['ar', 'en']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'empty_update' });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const requestOtpSchema = z.object({
  phone: libyanPhoneSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: libyanPhoneSchema,
  code: z.string().regex(/^\d{6}$/, { message: 'invalid_otp_code' }),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

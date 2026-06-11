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

export const loginSchema = z.object({
  phone: libyanPhoneSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

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

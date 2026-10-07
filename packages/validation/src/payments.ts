import { z } from 'zod';

import { libyanPhoneSchema } from './phone';

/** Shared payment input contracts (API + clients). */

export const paymentMethodSchema = z.enum(['COD', 'SADAD', 'ADFALI', 'CARD']);
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

/** Methods supported at launch (Step 8): cash on delivery + the two mobile wallets. */
export const initPaymentMethodSchema = z.enum(['COD', 'SADAD', 'ADFALI']);
export type InitPaymentMethodInput = z.infer<typeof initPaymentMethodSchema>;

/**
 * Initiates payment for a booking. Wallet methods (Sadad/Adfali) need the
 * payer's wallet number, which Plutu sends the OTP to; COD needs nothing.
 */
export const initPaymentSchema = z
  .object({
    method: initPaymentMethodSchema,
    mobileNumber: libyanPhoneSchema.optional(),
  })
  .refine((data) => data.method === 'COD' || Boolean(data.mobileNumber), {
    path: ['mobileNumber'],
    message: 'mobile_number_required',
  });
export type InitPaymentInput = z.infer<typeof initPaymentSchema>;

/** Confirms a wallet payment with the OTP Plutu sent to the payer. */
export const confirmPaymentSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, { message: 'invalid_otp_code' }),
});
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

/**
 * Plutu async callback shape (sandbox). `reference` echoes the payment id we
 * passed at init; the signature (verified separately) guards authenticity.
 */
export const plutuWebhookSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(['SUCCESS', 'FAILED']),
  transactionRef: z.string().min(1).optional(),
});
export type PlutuWebhookPayload = z.infer<typeof plutuWebhookSchema>;

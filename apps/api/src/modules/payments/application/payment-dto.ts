import type { Payment } from '@prisma/client';

export interface PaymentDto {
  id: string;
  amountLYD: string;
  method: Payment['method'];
  provider: Payment['provider'];
  status: Payment['status'];
  /** True while a Plutu wallet charge is awaiting the customer's OTP. */
  requiresOtp: boolean;
  initiatedAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
}

export function toPaymentDto(payment: Payment): PaymentDto {
  return {
    id: payment.id,
    amountLYD: payment.amountLYD.toFixed(2),
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    requiresOtp: payment.status === 'PENDING' && payment.provider === 'PLUTU',
    initiatedAt: payment.initiatedAt,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
  };
}

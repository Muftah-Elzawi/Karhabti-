import type { PaymentStatus } from '@prisma/client';

/**
 * Payment state machine — pure domain logic, no framework imports.
 *
 *   INITIATED ──gateway accepts──► PENDING ──confirm/webhook──► SUCCESS ──admin──► REFUNDED
 *       │ gateway fails               │ declined / wrong OTP
 *       ▼                             ▼
 *     FAILED                        FAILED
 *
 * COD payments are created directly as PENDING (cash awaiting collection) and
 * settle to SUCCESS on the same confirm/webhook path.
 */

export const PAYMENT_TERMINAL: readonly PaymentStatus[] = ['FAILED', 'REFUNDED'];

const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  INITIATED: ['PENDING', 'FAILED'],
  PENDING: ['SUCCESS', 'FAILED'],
  SUCCESS: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: PaymentStatus): boolean {
  return PAYMENT_TERMINAL.includes(status);
}

/** Timestamp column stamped when a payment reaches each state. */
export const PAYMENT_STATUS_TIMESTAMP: Partial<
  Record<PaymentStatus, 'paidAt' | 'failedAt' | 'refundedAt'>
> = {
  SUCCESS: 'paidAt',
  FAILED: 'failedAt',
  REFUNDED: 'refundedAt',
};

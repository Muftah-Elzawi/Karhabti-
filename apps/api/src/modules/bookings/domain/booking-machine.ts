import type { BookingStatus } from '@prisma/client';

/**
 * Booking state machine — pure domain logic, no framework imports.
 *
 *   PENDING ──admin assigns──► PENDING(assigned) ──provider accepts──► CONFIRMED
 *      ▲                            │ provider declines                    │ provider starts
 *      └────────────────────────────┘                                      ▼
 *   customer cancels (PENDING/CONFIRMED) ──► CANCELLED              IN_PROGRESS ──provider completes──► COMPLETED
 *   admin may override transitions from any non-terminal state.
 */

export const TERMINAL_STATUSES: readonly BookingStatus[] = ['COMPLETED', 'CANCELLED'];

export interface BookingSnapshot {
  status: BookingStatus;
  providerId: string | null;
}

export function canCustomerCancel(booking: BookingSnapshot): boolean {
  return booking.status === 'PENDING' || booking.status === 'CONFIRMED';
}

export function canAdminAssign(booking: BookingSnapshot): boolean {
  // (Re)assignment only while the work hasn't been accepted yet.
  return booking.status === 'PENDING';
}

export type ProviderAction = 'accept' | 'decline' | 'start' | 'complete';

/** Status required for each provider action (all also require assignment). */
const PROVIDER_ACTION_FROM: Record<ProviderAction, BookingStatus> = {
  accept: 'PENDING',
  decline: 'PENDING',
  start: 'CONFIRMED',
  complete: 'IN_PROGRESS',
};

export function canProviderAct(booking: BookingSnapshot, action: ProviderAction): boolean {
  return booking.providerId !== null && booking.status === PROVIDER_ACTION_FROM[action];
}

export function canAdminOverride(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATUSES.includes(from)) return false;
  // CONFIRMED/IN_PROGRESS require an assigned provider — enforced by the service.
  return true;
}

/** Timestamp column stamped by each transition target. */
export const STATUS_TIMESTAMP: Partial<
  Record<BookingStatus, 'confirmedAt' | 'inProgressAt' | 'completedAt' | 'cancelledAt'>
> = {
  CONFIRMED: 'confirmedAt',
  IN_PROGRESS: 'inProgressAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
};

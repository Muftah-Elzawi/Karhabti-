import { z } from 'zod';

import { cursorQuerySchema } from './catalog';

/** Shared booking input contracts. */

export const bookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  vehicleId: z.string().min(1),
  addressId: z.string().min(1),
  scheduledFor: z.coerce
    .date()
    .refine((value) => value.getTime() > Date.now(), { message: 'scheduled_in_past' }),
  notes: z.string().trim().max(500).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(2).max(300).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(2).max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const assignBookingSchema = z.object({
  providerId: z.string().min(1),
});
export type AssignBookingInput = z.infer<typeof assignBookingSchema>;

export const adminBookingStatusSchema = z.object({
  status: bookingStatusSchema,
  reason: z.string().trim().min(2).max(300).optional(),
});
export type AdminBookingStatusInput = z.infer<typeof adminBookingStatusSchema>;

export const listBookingsQuerySchema = cursorQuerySchema.extend({
  status: bookingStatusSchema.optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

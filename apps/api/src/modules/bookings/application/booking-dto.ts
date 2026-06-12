import type { BookingStatus } from '@prisma/client';

import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import type { BookingWithRelations } from '../infrastructure/booking.repository';

export interface BookingDto {
  id: string;
  status: BookingStatus;
  scheduledFor: Date;
  priceLYD: string;
  notes: string | null;
  service: { id: string; name: string; durationMinutes: number };
  vehicle: { id: string; label: string };
  address: { id: string; label: string; governorate: string; area: string };
  provider: { id: string; businessName: string } | null;
  review: { rating: number; body: string | null } | null;
  cancellationReason: string | null;
  timeline: {
    createdAt: Date;
    confirmedAt: Date | null;
    inProgressAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  };
}

export function toBookingDto(
  booking: BookingWithRelations,
  locale: RequestLocaleValue,
): BookingDto {
  const vehicleName = `${booking.vehicle.make.name} ${booking.vehicle.model.name} ${booking.vehicle.year}`;
  return {
    id: booking.id,
    status: booking.status,
    scheduledFor: booking.scheduledFor,
    priceLYD: booking.priceLYD.toFixed(2),
    notes: booking.notes,
    service: {
      id: booking.service.id,
      name: locale === 'en' ? booking.service.nameEn : booking.service.nameAr,
      durationMinutes: booking.service.durationMinutes,
    },
    vehicle: { id: booking.vehicle.id, label: booking.vehicle.nickname ?? vehicleName },
    address: {
      id: booking.address.id,
      label: booking.address.label,
      governorate: booking.address.governorate,
      area: booking.address.area,
    },
    provider: booking.provider
      ? { id: booking.provider.id, businessName: booking.provider.businessName }
      : null,
    review: booking.review ? { rating: booking.review.rating, body: booking.review.body } : null,
    cancellationReason: booking.cancellationReason,
    timeline: {
      createdAt: booking.createdAt,
      confirmedAt: booking.confirmedAt,
      inProgressAt: booking.inProgressAt,
      completedAt: booking.completedAt,
      cancelledAt: booking.cancelledAt,
    },
  };
}

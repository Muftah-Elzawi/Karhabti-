import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CancelBookingInput,
  CreateBookingInput,
  CreateReviewInput,
  ListBookingsQuery,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { NotificationService } from '../../notifications/application/notification.service';
import { canCustomerCancel } from '../domain/booking-machine';
import { BOOKING_NOTIFICATIONS } from '../domain/booking-notifications';
import type { BookingWithRelations } from '../infrastructure/booking.repository';
import { BookingRepository } from '../infrastructure/booking.repository';
import type { BookingDto } from './booking-dto';
import { toBookingDto } from './booking-dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async create(
    customerId: string,
    input: CreateBookingInput,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const service = await this.bookingRepository.findActiveService(input.serviceId);
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Unknown service' });
    }
    const vehicle = await this.bookingRepository.findOwnedVehicle(input.vehicleId, customerId);
    if (!vehicle) {
      throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Unknown vehicle' });
    }
    const address = await this.bookingRepository.findOwnedAddress(input.addressId, customerId);
    if (!address) {
      throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Unknown address' });
    }

    const booking = await this.bookingRepository.create({
      customerId,
      serviceId: service.id,
      vehicleId: vehicle.id,
      addressId: address.id,
      scheduledFor: input.scheduledFor,
      notes: input.notes,
      // Price is snapshotted at booking time — later catalog changes never
      // affect existing bookings.
      priceLYD: service.basePriceLYD,
    });

    await this.auditLog.append({
      actorId: customerId,
      action: 'booking.create',
      entityType: 'ServiceBooking',
      entityId: booking.id,
      after: {
        serviceId: service.id,
        scheduledFor: booking.scheduledFor.toISOString(),
        priceLYD: booking.priceLYD.toFixed(2),
      },
    });
    return toBookingDto(booking, locale);
  }

  async myBookings(
    customerId: string,
    query: ListBookingsQuery,
    locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    const rows = await this.bookingRepository.list({
      customerId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), (row) => toBookingDto(row, locale));
  }

  async getBooking(
    customerId: string,
    bookingId: string,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const booking = await this.ownedBooking(customerId, bookingId);
    return toBookingDto(booking, locale);
  }

  async cancel(
    customerId: string,
    bookingId: string,
    input: CancelBookingInput,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const booking = await this.ownedBooking(customerId, bookingId);
    if (!canCustomerCancel(booking)) {
      throw new ConflictException({
        code: 'CANNOT_CANCEL',
        message: 'This booking can no longer be cancelled',
      });
    }

    const updated = await this.bookingRepository.update(bookingId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: input.reason ?? null,
    });

    await this.auditLog.append({
      actorId: customerId,
      action: 'booking.cancel',
      entityType: 'ServiceBooking',
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: 'CANCELLED', reason: input.reason ?? null },
    });
    // The assigned provider (if any) needs to know the job is gone.
    if (booking.provider) {
      await this.notificationService.notify({
        userId: booking.provider.userId,
        type: 'booking-status',
        ...BOOKING_NOTIFICATIONS.cancelled,
        deepLink: `/provider/bookings/${bookingId}`,
      });
    }
    return toBookingDto(updated, locale);
  }

  async review(
    customerId: string,
    bookingId: string,
    input: CreateReviewInput,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const booking = await this.ownedBooking(customerId, bookingId);
    if (booking.status !== 'COMPLETED') {
      throw new ConflictException({
        code: 'BOOKING_NOT_COMPLETED',
        message: 'Only completed bookings can be reviewed',
      });
    }
    if (booking.review) {
      throw new ConflictException({
        code: 'ALREADY_REVIEWED',
        message: 'This booking already has a review',
      });
    }

    await this.bookingRepository.createReviewAndRecomputeRating({
      bookingId,
      customerId,
      rating: input.rating,
      body: input.body,
      providerId: booking.providerId,
    });
    await this.auditLog.append({
      actorId: customerId,
      action: 'booking.review',
      entityType: 'ServiceBooking',
      entityId: bookingId,
      after: { rating: input.rating },
    });

    const refreshed = await this.bookingRepository.findById(bookingId);
    return toBookingDto(refreshed as BookingWithRelations, locale);
  }

  /** Ownership check — a foreign booking id behaves exactly like a missing one. */
  private async ownedBooking(customerId: string, bookingId: string): Promise<BookingWithRelations> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking || booking.customerId !== customerId) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Unknown booking' });
    }
    return booking;
  }
}

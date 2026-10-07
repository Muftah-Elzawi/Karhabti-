import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AdminBookingStatusInput,
  AssignBookingInput,
  ListBookingsQuery,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { SMS_SENDER, SmsSender } from '../../../infrastructure/sms/sms-sender';
import { NotificationService } from '../../notifications/application/notification.service';
import { canAdminAssign, canAdminOverride, STATUS_TIMESTAMP } from '../domain/booking-machine';
import { BOOKING_NOTIFICATIONS, bookingSms } from '../domain/booking-notifications';
import type { BookingWithRelations } from '../infrastructure/booking.repository';
import { BookingRepository } from '../infrastructure/booking.repository';
import type { BookingDto } from './booking-dto';
import { toBookingDto } from './booking-dto';

/** Admin intervention: assignment and status override. */
@Injectable()
export class BookingAdminService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
  ) {}

  async list(
    query: ListBookingsQuery,
    locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    const rows = await this.bookingRepository.list({
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), (row) => toBookingDto(row, locale));
  }

  async assign(
    actorId: string,
    bookingId: string,
    input: AssignBookingInput,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const booking = await this.requireBooking(bookingId);
    if (!canAdminAssign(booking)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: 'Only pending bookings can be (re)assigned',
      });
    }
    const provider = await this.bookingRepository.findProvider(input.providerId);
    if (!provider || provider.status !== 'ACTIVE' || !provider.isVerified) {
      throw new ConflictException({
        code: 'PROVIDER_NOT_ELIGIBLE',
        message: 'Provider must be active and verified',
      });
    }

    const updated = await this.bookingRepository.update(bookingId, { providerId: provider.id });
    await this.auditLog.append({
      actorId,
      action: 'booking.assign',
      entityType: 'ServiceBooking',
      entityId: bookingId,
      before: { providerId: booking.providerId },
      after: { providerId: provider.id },
    });

    await this.notificationService.notify({
      userId: provider.userId,
      type: 'booking-status',
      ...BOOKING_NOTIFICATIONS.assigned_to_provider,
      deepLink: `/provider/bookings/${bookingId}`,
    });
    await this.notificationService.notify({
      userId: booking.customerId,
      type: 'booking-status',
      ...BOOKING_NOTIFICATIONS.assigned_customer,
      deepLink: `/bookings/${bookingId}`,
    });
    return toBookingDto(updated, locale);
  }

  async overrideStatus(
    actorId: string,
    bookingId: string,
    input: AdminBookingStatusInput,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const booking = await this.requireBooking(bookingId);
    if (!canAdminOverride(booking.status, input.status)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move a ${booking.status} booking to ${input.status}`,
      });
    }
    if ((input.status === 'CONFIRMED' || input.status === 'IN_PROGRESS') && !booking.providerId) {
      throw new ConflictException({
        code: 'PROVIDER_REQUIRED',
        message: 'Assign a provider before this status',
      });
    }

    const timestampField = STATUS_TIMESTAMP[input.status];
    const updated = await this.bookingRepository.update(bookingId, {
      status: input.status,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
      ...(input.status === 'CANCELLED' ? { cancellationReason: input.reason ?? null } : {}),
    });

    await this.auditLog.append({
      actorId,
      action: 'booking.admin_override',
      entityType: 'ServiceBooking',
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: input.status, reason: input.reason ?? null },
    });

    const notificationKey = (
      {
        CONFIRMED: 'confirmed',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
      } as const
    )[input.status as Exclude<AdminBookingStatusInput['status'], 'PENDING'>];
    if (notificationKey) {
      await this.notificationService.notify({
        userId: booking.customerId,
        type: 'booking-status',
        ...BOOKING_NOTIFICATIONS[notificationKey],
        deepLink: `/bookings/${bookingId}`,
      });
    }
    if (input.status === 'CANCELLED') {
      const customer = await this.bookingRepository.findCustomerUser(booking.customerId);
      if (customer)
        await this.smsSender.send(customer.phone, bookingSms.cancelled()).catch(() => undefined);
    }
    return toBookingDto(updated, locale);
  }

  private async requireBooking(bookingId: string): Promise<BookingWithRelations> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Unknown booking' });
    }
    return booking;
  }
}

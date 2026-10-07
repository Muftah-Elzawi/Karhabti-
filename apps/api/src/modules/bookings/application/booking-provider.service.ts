import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ServiceProvider } from '@prisma/client';

import type { ListBookingsQuery } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { SMS_SENDER, SmsSender } from '../../../infrastructure/sms/sms-sender';
import { NotificationService } from '../../notifications/application/notification.service';
import type { ProviderAction } from '../domain/booking-machine';
import { canProviderAct } from '../domain/booking-machine';
import { BOOKING_NOTIFICATIONS, bookingSms } from '../domain/booking-notifications';
import type { BookingWithRelations } from '../infrastructure/booking.repository';
import { BookingRepository } from '../infrastructure/booking.repository';
import type { BookingDto } from './booking-dto';
import { toBookingDto } from './booking-dto';

/** Provider portal use-cases: my jobs, accept/decline, start/complete. */
@Injectable()
export class BookingProviderService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
  ) {}

  async myJobs(
    userId: string,
    query: ListBookingsQuery,
    locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    const provider = await this.providerProfile(userId);
    const rows = await this.bookingRepository.list({
      providerId: provider.id,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), (row) => toBookingDto(row, locale));
  }

  async act(
    userId: string,
    bookingId: string,
    action: ProviderAction,
    locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    const provider = await this.providerProfile(userId);
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking || booking.providerId !== provider.id) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Unknown booking' });
    }
    if (!canProviderAct(booking, action)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot ${action} a ${booking.status} booking`,
      });
    }

    const updated = await this.applyAction(booking, action);
    await this.auditLog.append({
      actorId: userId,
      action: `booking.provider_${action}`,
      entityType: 'ServiceBooking',
      entityId: bookingId,
      before: { status: booking.status, providerId: booking.providerId },
      after: { status: updated.status, providerId: updated.providerId },
    });
    return toBookingDto(updated, locale);
  }

  private async applyAction(
    booking: BookingWithRelations,
    action: ProviderAction,
  ): Promise<BookingWithRelations> {
    switch (action) {
      case 'accept': {
        const updated = await this.bookingRepository.update(booking.id, {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        });
        await this.notifyCustomer(booking, 'confirmed');
        await this.smsCustomer(booking, bookingSms.confirmed(booking.scheduledFor));
        return updated;
      }
      case 'decline': {
        // Back to the unassigned pool — admin will pick someone else.
        const updated = await this.bookingRepository.update(booking.id, { providerId: null });
        await this.notifyCustomer(booking, 'declined_unassigned');
        return updated;
      }
      case 'start': {
        const updated = await this.bookingRepository.update(booking.id, {
          status: 'IN_PROGRESS',
          inProgressAt: new Date(),
        });
        await this.notifyCustomer(booking, 'in_progress');
        return updated;
      }
      case 'complete': {
        const updated = await this.bookingRepository.update(booking.id, {
          status: 'COMPLETED',
          completedAt: new Date(),
        });
        await this.notifyCustomer(booking, 'completed');
        return updated;
      }
    }
  }

  private async notifyCustomer(
    booking: BookingWithRelations,
    key: keyof typeof BOOKING_NOTIFICATIONS,
  ): Promise<void> {
    await this.notificationService.notify({
      userId: booking.customerId,
      type: 'booking-status',
      ...BOOKING_NOTIFICATIONS[key],
      deepLink: `/bookings/${booking.id}`,
    });
  }

  private async smsCustomer(booking: BookingWithRelations, message: string): Promise<void> {
    const customer = await this.bookingRepository.findCustomerUser(booking.customerId);
    if (customer) await this.smsSender.send(customer.phone, message).catch(() => undefined);
  }

  private async providerProfile(userId: string): Promise<ServiceProvider> {
    const provider = await this.bookingRepository.findProviderByUserId(userId);
    if (!provider) {
      throw new ForbiddenException({
        code: 'NOT_A_PROVIDER',
        message: 'No provider profile for this account',
      });
    }
    return provider;
  }
}

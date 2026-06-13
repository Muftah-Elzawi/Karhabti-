import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Payment, Prisma } from '@prisma/client';

import type { ConfirmPaymentInput, InitPaymentInput } from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway, WalletMethod } from '../../../infrastructure/plutu/plutu-gateway';
import { PLUTU_GATEWAY, PlutuError } from '../../../infrastructure/plutu/plutu-gateway';
import { SMS_SENDER, SmsSender } from '../../../infrastructure/sms/sms-sender';
import { NotificationService } from '../../notifications/application/notification.service';
import { PAYMENT_NOTIFICATIONS, paymentSms } from '../domain/payment-notifications';
import type { BookingWithPayment } from '../infrastructure/payment.repository';
import { PaymentRepository } from '../infrastructure/payment.repository';
import type { PaymentDto } from './payment-dto';
import { toPaymentDto } from './payment-dto';

/** Reads back the wallet number stashed in rawPayload at init time. */
function readMobileNumber(payment: Payment): string | null {
  const raw = payment.rawPayload;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const request = (raw as Record<string, unknown>)['request'];
    if (request && typeof request === 'object' && !Array.isArray(request)) {
      const mobile = (request as Record<string, unknown>)['mobileNumber'];
      if (typeof mobile === 'string') return mobile;
    }
  }
  return null;
}

function baseRaw(payment: Payment): Record<string, unknown> {
  const raw = payment.rawPayload;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

/** Customer-facing payment use-cases: initiate and confirm a booking payment. */
@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
    @Inject(PLUTU_GATEWAY) private readonly plutu: PlutuGateway,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
  ) {}

  async initForBooking(
    customerId: string,
    bookingId: string,
    input: InitPaymentInput,
  ): Promise<PaymentDto> {
    const booking = await this.requireOwnedBooking(customerId, bookingId);
    if (booking.payment && booking.payment.status !== 'FAILED') {
      throw new ConflictException(
        booking.payment.status === 'SUCCESS'
          ? { code: 'PAYMENT_ALREADY_PAID', message: 'This booking is already paid' }
          : { code: 'PAYMENT_IN_PROGRESS', message: 'A payment is already in progress' },
      );
    }

    // Cash on delivery: no gateway — a pending cash record settled on collection.
    if (input.method === 'COD') {
      const payment = await this.paymentRepository.createForBooking({
        bookingId,
        amountLYD: booking.priceLYD,
        method: 'COD',
        provider: 'CASH',
        status: 'PENDING',
      });
      await this.audit(customerId, 'payment.init', payment, { method: 'COD' });
      return toPaymentDto(payment);
    }

    // Wallet (Sadad/Adfali): create INITIATED, call Plutu, then move to PENDING.
    const mobileNumber = input.mobileNumber as string; // schema guarantees presence
    const created = await this.paymentRepository.createForBooking({
      bookingId,
      amountLYD: booking.priceLYD,
      method: input.method,
      provider: 'PLUTU',
      status: 'INITIATED',
      rawPayload: { request: { method: input.method, mobileNumber } },
    });

    try {
      const result = await this.plutu.initWallet({
        method: input.method,
        amountLYD: booking.priceLYD.toFixed(2),
        mobileNumber,
        reference: created.id,
      });
      const pending = await this.paymentRepository.update(created.id, {
        status: 'PENDING',
        plutuRef: result.processId,
        rawPayload: {
          request: { method: input.method, mobileNumber },
          init: result.raw,
        } as Prisma.InputJsonValue,
      });
      await this.audit(customerId, 'payment.init', pending, { method: input.method });
      await this.smsCustomer(booking.customerId, paymentSms.otpSent());
      return toPaymentDto(pending);
    } catch (error) {
      const failed = await this.paymentRepository.update(created.id, {
        status: 'FAILED',
        failedAt: new Date(),
      });
      await this.audit(customerId, 'payment.failed', failed, { reason: 'init_failed' });
      throw this.mapPlutuError(error);
    }
  }

  async confirmForBooking(
    customerId: string,
    bookingId: string,
    input: ConfirmPaymentInput,
  ): Promise<PaymentDto> {
    const booking = await this.requireOwnedBooking(customerId, bookingId);
    const payment = booking.payment;
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'No payment to confirm' });
    }
    if (payment.provider !== 'PLUTU') {
      throw new ConflictException({
        code: 'PAYMENT_NOT_CONFIRMABLE',
        message: 'This payment has no OTP step',
      });
    }
    if (payment.status !== 'PENDING' || !payment.plutuRef) {
      throw new ConflictException({
        code: 'INVALID_PAYMENT_STATE',
        message: 'Payment is not awaiting confirmation',
      });
    }
    const mobileNumber = readMobileNumber(payment);
    if (!mobileNumber) {
      throw new ConflictException({
        code: 'INVALID_PAYMENT_STATE',
        message: 'Missing wallet number for confirmation',
      });
    }

    try {
      const result = await this.plutu.confirmWallet({
        method: payment.method as WalletMethod,
        processId: payment.plutuRef,
        code: input.code,
        amountLYD: payment.amountLYD.toFixed(2),
        mobileNumber,
      });
      const paid = await this.paymentRepository.update(payment.id, {
        status: 'SUCCESS',
        paidAt: new Date(),
        rawPayload: {
          ...baseRaw(payment),
          confirm: result.raw,
          transactionRef: result.transactionRef,
        } as Prisma.InputJsonValue,
      });
      await this.audit(customerId, 'payment.confirm', paid, {
        transactionRef: result.transactionRef,
      });
      await this.notifyCustomer(booking.customerId, 'paid', bookingId);
      return toPaymentDto(paid);
    } catch (error) {
      // A wrong OTP is recoverable — leave the payment PENDING so they can retry.
      if (error instanceof PlutuError && error.code === 'OTP_INVALID') {
        throw new ConflictException({ code: 'OTP_INVALID', message: 'The OTP code is incorrect' });
      }
      const failed = await this.paymentRepository.update(payment.id, {
        status: 'FAILED',
        failedAt: new Date(),
      });
      await this.audit(customerId, 'payment.failed', failed, { reason: 'confirm_failed' });
      await this.notifyCustomer(booking.customerId, 'failed', bookingId);
      throw this.mapPlutuError(error);
    }
  }

  private async requireOwnedBooking(
    customerId: string,
    bookingId: string,
  ): Promise<BookingWithPayment> {
    const booking = await this.paymentRepository.findBookingWithPayment(bookingId);
    if (!booking || booking.customerId !== customerId) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Unknown booking' });
    }
    return booking;
  }

  private async audit(
    actorId: string,
    action: string,
    payment: Payment,
    extra: Record<string, string>,
  ): Promise<void> {
    await this.auditLog.append({
      actorId,
      action,
      entityType: 'Payment',
      entityId: payment.id,
      after: { status: payment.status, method: payment.method, ...extra },
    });
  }

  private async notifyCustomer(
    customerId: string,
    key: keyof typeof PAYMENT_NOTIFICATIONS,
    bookingId: string,
  ): Promise<void> {
    await this.notificationService.notify({
      userId: customerId,
      type: 'payment',
      ...PAYMENT_NOTIFICATIONS[key],
      deepLink: `/bookings/${bookingId}`,
    });
  }

  private async smsCustomer(customerId: string, message: string): Promise<void> {
    const customer = await this.paymentRepository.findUserContact(customerId);
    if (customer) await this.smsSender.send(customer.phone, message).catch(() => undefined);
  }

  private mapPlutuError(error: unknown): Error {
    if (error instanceof PlutuError && error.code === 'DECLINED') {
      return new ConflictException({
        code: 'PAYMENT_DECLINED',
        message: 'The payment was declined',
      });
    }
    return new BadGatewayException({
      code: 'PAYMENT_GATEWAY_ERROR',
      message: 'Payment gateway error',
    });
  }
}

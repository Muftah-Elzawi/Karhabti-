import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Payment, Prisma } from '@prisma/client';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway } from '../../../infrastructure/plutu/plutu-gateway';
import { PLUTU_GATEWAY } from '../../../infrastructure/plutu/plutu-gateway';
import { NotificationService } from '../../notifications/application/notification.service';
import { canTransition } from '../domain/payment-machine';
import { PAYMENT_NOTIFICATIONS } from '../domain/payment-notifications';
import { PaymentRepository } from '../infrastructure/payment.repository';
import type { PaymentDto } from './payment-dto';
import { toPaymentDto } from './payment-dto';

function transactionRef(payment: Payment): string | null {
  const raw = payment.rawPayload;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const ref = (raw as Record<string, unknown>)['transactionRef'];
    if (typeof ref === 'string') return ref;
  }
  return payment.plutuRef;
}

/** Admin intervention: refund a settled payment. */
@Injectable()
export class PaymentAdminService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
    @Inject(PLUTU_GATEWAY) private readonly plutu: PlutuGateway,
  ) {}

  async refund(adminId: string, paymentId: string): Promise<PaymentDto> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Unknown payment' });
    }
    if (!canTransition(payment.status, 'REFUNDED')) {
      throw new ConflictException({
        code: 'CANNOT_REFUND',
        message: 'Only a successful payment can be refunded',
      });
    }

    // Cash (COD) refunds are settled in person — only Plutu charges hit the gateway.
    let refundRaw: Prisma.InputJsonValue = { manual: true };
    if (payment.provider === 'PLUTU') {
      const result = await this.plutu.refund({
        transactionRef: transactionRef(payment) ?? '',
        amountLYD: payment.amountLYD.toFixed(2),
      });
      refundRaw = { refundRef: result.refundRef };
    }

    const updated = await this.paymentRepository.update(payment.id, {
      status: 'REFUNDED',
      refundedAt: new Date(),
      rawPayload: { ...refundOf(payment), refund: refundRaw } as Prisma.InputJsonValue,
    });

    await this.auditLog.append({
      actorId: adminId,
      action: 'payment.refund',
      entityType: 'Payment',
      entityId: payment.id,
      before: { status: payment.status },
      after: { status: 'REFUNDED' },
    });

    if (payment.relatedType === 'BOOKING') {
      const customer = await this.paymentRepository.findCustomerForPayment(updated);
      if (customer) {
        await this.notificationService.notify({
          userId: customer.id,
          type: 'payment',
          ...PAYMENT_NOTIFICATIONS.refunded,
          deepLink: `/bookings/${updated.relatedId}`,
        });
      }
    }
    return toPaymentDto(updated);
  }
}

function refundOf(payment: Payment): Record<string, unknown> {
  const raw = payment.rawPayload;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

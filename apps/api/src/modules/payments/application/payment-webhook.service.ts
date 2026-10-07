import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Payment, PaymentStatus, Prisma } from '@prisma/client';

import { plutuWebhookSchema } from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway } from '../../../infrastructure/plutu/plutu-gateway';
import { PLUTU_GATEWAY } from '../../../infrastructure/plutu/plutu-gateway';
import { NotificationService } from '../../notifications/application/notification.service';
import { PAYMENT_STATUS_TIMESTAMP, canTransition } from '../domain/payment-machine';
import { PAYMENT_NOTIFICATIONS } from '../domain/payment-notifications';
import { PaymentRepository } from '../infrastructure/payment.repository';

function baseRaw(payment: Payment): Record<string, unknown> {
  const raw = payment.rawPayload;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

/** Processes Plutu's async callbacks. Signature-verified and idempotent. */
@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLog: AuditLogRepository,
    @Inject(PLUTU_GATEWAY) private readonly plutu: PlutuGateway,
  ) {}

  async handle(rawBody: string, signature: string | undefined): Promise<{ received: true }> {
    // Verify BEFORE parsing — never act on an unauthenticated payload.
    if (!signature || !this.plutu.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid webhook signature',
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException({ code: 'INVALID_PAYLOAD', message: 'Malformed JSON' });
    }
    const parsed = plutuWebhookSchema.safeParse(json);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_PAYLOAD', message: 'Unexpected payload' });
    }

    const payment = await this.paymentRepository.findById(parsed.data.reference);
    // Unknown reference: ack without acting (avoids leaking which ids exist).
    if (!payment) return { received: true };

    const target: PaymentStatus = parsed.data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    // Idempotent: a repeat callback (or one racing the OTP confirm) is a no-op.
    if (!canTransition(payment.status, target)) return { received: true };

    const timestampField = PAYMENT_STATUS_TIMESTAMP[target];
    const updated = await this.paymentRepository.update(payment.id, {
      status: target,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
      rawPayload: { ...baseRaw(payment), webhook: parsed.data } as Prisma.InputJsonValue,
    });

    await this.auditLog.append({
      actorId: null, // system action
      action: 'payment.webhook',
      entityType: 'Payment',
      entityId: payment.id,
      before: { status: payment.status },
      after: { status: updated.status },
    });

    const customer = await this.paymentRepository.findCustomerForPayment(updated);
    if (customer) {
      await this.notificationService.notify({
        userId: customer.id,
        type: 'payment',
        ...PAYMENT_NOTIFICATIONS[target === 'SUCCESS' ? 'paid' : 'failed'],
        deepLink: `/bookings/${updated.relatedId}`,
      });
    }
    return { received: true };
  }
}

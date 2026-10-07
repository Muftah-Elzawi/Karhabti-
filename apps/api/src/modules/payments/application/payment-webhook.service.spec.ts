import { UnauthorizedException } from '@nestjs/common';
import type { Payment } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway } from '../../../infrastructure/plutu/plutu-gateway';
import type { NotificationService } from '../../notifications/application/notification.service';
import type { PaymentRepository } from '../infrastructure/payment.repository';
import { PaymentWebhookService } from './payment-webhook.service';

const payment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 'pay-1',
    amountLYD: new Prisma.Decimal('40.00'),
    method: 'SADAD',
    provider: 'PLUTU',
    status: 'PENDING',
    plutuRef: 'proc-1',
    rawPayload: null,
    relatedType: 'BOOKING',
    relatedId: 'bk-1',
    initiatedAt: new Date(),
    paidAt: null,
    failedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Payment;

describe('PaymentWebhookService', () => {
  const createMocks = () => {
    const paymentRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findCustomerForPayment: jest.fn().mockResolvedValue({ id: 'cust-1', phone: '0913334444' }),
    };
    const notificationService = { notify: jest.fn() };
    const auditLog = { append: jest.fn() };
    const plutu = { verifyWebhookSignature: jest.fn() };
    const service = new PaymentWebhookService(
      paymentRepository as unknown as PaymentRepository,
      notificationService as unknown as NotificationService,
      auditLog as unknown as AuditLogRepository,
      plutu as unknown as PlutuGateway,
    );
    return { paymentRepository, notificationService, auditLog, plutu, service };
  };

  const body = (payload: unknown) => JSON.stringify(payload);

  it('rejects an invalid signature before touching anything', async () => {
    const m = createMocks();
    m.plutu.verifyWebhookSignature.mockReturnValue(false);
    await expect(
      m.service.handle(body({ reference: 'pay-1', status: 'SUCCESS' }), 'bad-sig'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(m.paymentRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects a missing signature', async () => {
    const m = createMocks();
    await expect(
      m.service.handle(body({ reference: 'pay-1', status: 'SUCCESS' }), undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('settles a PENDING payment to SUCCESS and notifies', async () => {
    const m = createMocks();
    m.plutu.verifyWebhookSignature.mockReturnValue(true);
    m.paymentRepository.findById.mockResolvedValue(payment({ status: 'PENDING' }));
    m.paymentRepository.update.mockResolvedValue(payment({ status: 'SUCCESS' }));

    const result = await m.service.handle(body({ reference: 'pay-1', status: 'SUCCESS' }), 'ok');

    expect(result).toEqual({ received: true });
    expect(m.paymentRepository.update).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ status: 'SUCCESS', paidAt: expect.any(Date) }),
    );
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payment.webhook', actorId: null }),
    );
    expect(m.notificationService.notify).toHaveBeenCalled();
  });

  it('is idempotent: a repeat callback on an already-SUCCESS payment is a no-op', async () => {
    const m = createMocks();
    m.plutu.verifyWebhookSignature.mockReturnValue(true);
    m.paymentRepository.findById.mockResolvedValue(payment({ status: 'SUCCESS' }));

    const result = await m.service.handle(body({ reference: 'pay-1', status: 'SUCCESS' }), 'ok');

    expect(result).toEqual({ received: true });
    expect(m.paymentRepository.update).not.toHaveBeenCalled();
  });

  it('acks an unknown reference without acting', async () => {
    const m = createMocks();
    m.plutu.verifyWebhookSignature.mockReturnValue(true);
    m.paymentRepository.findById.mockResolvedValue(null);

    const result = await m.service.handle(body({ reference: 'nope', status: 'SUCCESS' }), 'ok');

    expect(result).toEqual({ received: true });
    expect(m.paymentRepository.update).not.toHaveBeenCalled();
  });
});

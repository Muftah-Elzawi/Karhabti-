import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Payment } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway } from '../../../infrastructure/plutu/plutu-gateway';
import type { NotificationService } from '../../notifications/application/notification.service';
import type { PaymentRepository } from '../infrastructure/payment.repository';
import { PaymentAdminService } from './payment-admin.service';

const payment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 'pay-1',
    amountLYD: new Prisma.Decimal('40.00'),
    method: 'SADAD',
    provider: 'PLUTU',
    status: 'SUCCESS',
    plutuRef: 'proc-1',
    rawPayload: { transactionRef: 'txn-9' },
    relatedType: 'BOOKING',
    relatedId: 'bk-1',
    initiatedAt: new Date(),
    paidAt: new Date(),
    failedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Payment;

describe('PaymentAdminService', () => {
  const createMocks = () => {
    const paymentRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findCustomerForPayment: jest.fn().mockResolvedValue({ id: 'cust-1', phone: '0913334444' }),
    };
    const notificationService = { notify: jest.fn() };
    const auditLog = { append: jest.fn() };
    const plutu = { refund: jest.fn() };
    const service = new PaymentAdminService(
      paymentRepository as unknown as PaymentRepository,
      notificationService as unknown as NotificationService,
      auditLog as unknown as AuditLogRepository,
      plutu as unknown as PlutuGateway,
    );
    return { paymentRepository, notificationService, auditLog, plutu, service };
  };

  it('refunds a successful Plutu charge via the gateway', async () => {
    const m = createMocks();
    m.paymentRepository.findById.mockResolvedValue(payment());
    m.plutu.refund.mockResolvedValue({ refundRef: 'ref-1', raw: {} });
    m.paymentRepository.update.mockResolvedValue(
      payment({ status: 'REFUNDED', refundedAt: new Date() }),
    );

    const dto = await m.service.refund('admin-1', 'pay-1');

    expect(m.plutu.refund).toHaveBeenCalledWith(
      expect.objectContaining({ transactionRef: 'txn-9', amountLYD: '40.00' }),
    );
    expect(dto.status).toBe('REFUNDED');
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payment.refund' }),
    );
    expect(m.notificationService.notify).toHaveBeenCalled();
  });

  it('refunds a COD/cash payment without calling the gateway', async () => {
    const m = createMocks();
    m.paymentRepository.findById.mockResolvedValue(
      payment({ method: 'COD', provider: 'CASH', plutuRef: null, rawPayload: null }),
    );
    m.paymentRepository.update.mockResolvedValue(payment({ status: 'REFUNDED' }));

    const dto = await m.service.refund('admin-1', 'pay-1');

    expect(m.plutu.refund).not.toHaveBeenCalled();
    expect(dto.status).toBe('REFUNDED');
  });

  it('rejects refunding a non-successful payment', async () => {
    const m = createMocks();
    m.paymentRepository.findById.mockResolvedValue(payment({ status: 'PENDING' }));
    await expect(m.service.refund('admin-1', 'pay-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s on an unknown payment', async () => {
    const m = createMocks();
    m.paymentRepository.findById.mockResolvedValue(null);
    await expect(m.service.refund('admin-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { BadGatewayException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Payment } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { PlutuGateway } from '../../../infrastructure/plutu/plutu-gateway';
import { PlutuError } from '../../../infrastructure/plutu/plutu-gateway';
import type { SmsSender } from '../../../infrastructure/sms/sms-sender';
import type { NotificationService } from '../../notifications/application/notification.service';
import type { BookingWithPayment, PaymentRepository } from '../infrastructure/payment.repository';
import { PaymentService } from './payment.service';

const payment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 'pay-1',
    amountLYD: new Prisma.Decimal('40.00'),
    method: 'COD',
    provider: 'CASH',
    status: 'PENDING',
    plutuRef: null,
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

const booking = (paymentRow: Payment | null = null): BookingWithPayment =>
  ({
    id: 'bk-1',
    customerId: 'cust-1',
    priceLYD: new Prisma.Decimal('40.00'),
    payment: paymentRow,
  }) as BookingWithPayment;

describe('PaymentService', () => {
  const createMocks = () => {
    const paymentRepository = {
      findById: jest.fn(),
      findBookingWithPayment: jest.fn(),
      createForBooking: jest.fn(),
      update: jest.fn(),
      findUserContact: jest.fn().mockResolvedValue({ id: 'cust-1', phone: '0913334444' }),
      findCustomerForPayment: jest.fn(),
    };
    const notificationService = { notify: jest.fn() };
    const auditLog = { append: jest.fn() };
    const plutu = {
      initWallet: jest.fn(),
      confirmWallet: jest.fn(),
      refund: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };
    const sms = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new PaymentService(
      paymentRepository as unknown as PaymentRepository,
      notificationService as unknown as NotificationService,
      auditLog as unknown as AuditLogRepository,
      plutu as unknown as PlutuGateway,
      sms as unknown as SmsSender,
    );
    return { paymentRepository, notificationService, auditLog, plutu, sms, service };
  };

  describe('initForBooking', () => {
    it('creates a pending cash payment for COD (no gateway call)', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(null));
      m.paymentRepository.createForBooking.mockResolvedValue(
        payment({ method: 'COD', provider: 'CASH', status: 'PENDING' }),
      );

      const dto = await m.service.initForBooking('cust-1', 'bk-1', { method: 'COD' });

      expect(m.plutu.initWallet).not.toHaveBeenCalled();
      expect(dto.method).toBe('COD');
      expect(dto.status).toBe('PENDING');
      expect(dto.requiresOtp).toBe(false);
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payment.init' }),
      );
    });

    it('runs the wallet flow: INITIATED → gateway → PENDING with OTP required', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(null));
      m.paymentRepository.createForBooking.mockResolvedValue(
        payment({ method: 'SADAD', provider: 'PLUTU', status: 'INITIATED' }),
      );
      m.plutu.initWallet.mockResolvedValue({ processId: 'proc-1', raw: {} });
      m.paymentRepository.update.mockResolvedValue(
        payment({ method: 'SADAD', provider: 'PLUTU', status: 'PENDING', plutuRef: 'proc-1' }),
      );

      const dto = await m.service.initForBooking('cust-1', 'bk-1', {
        method: 'SADAD',
        mobileNumber: '0913334444',
      });

      expect(m.plutu.initWallet).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'SADAD', amountLYD: '40.00', reference: 'pay-1' }),
      );
      expect(m.paymentRepository.update).toHaveBeenCalledWith(
        'pay-1',
        expect.objectContaining({ status: 'PENDING', plutuRef: 'proc-1' }),
      );
      expect(m.sms.send).toHaveBeenCalled();
      expect(dto.status).toBe('PENDING');
      expect(dto.requiresOtp).toBe(true);
    });

    it('marks the payment FAILED and throws when the gateway init fails', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(null));
      m.paymentRepository.createForBooking.mockResolvedValue(
        payment({ method: 'ADFALI', provider: 'PLUTU', status: 'INITIATED' }),
      );
      m.plutu.initWallet.mockRejectedValue(new PlutuError('GATEWAY_ERROR', 'boom'));
      m.paymentRepository.update.mockResolvedValue(
        payment({ method: 'ADFALI', provider: 'PLUTU', status: 'FAILED' }),
      );

      await expect(
        m.service.initForBooking('cust-1', 'bk-1', {
          method: 'ADFALI',
          mobileNumber: '0913334444',
        }),
      ).rejects.toBeInstanceOf(BadGatewayException);
      expect(m.paymentRepository.update).toHaveBeenCalledWith(
        'pay-1',
        expect.objectContaining({ status: 'FAILED' }),
      );
    });

    it('rejects a second payment when one already succeeded', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(
        booking(payment({ status: 'SUCCESS' })),
      );
      await expect(
        m.service.initForBooking('cust-1', 'bk-1', { method: 'COD' }),
      ).rejects.toMatchObject({ response: { code: 'PAYMENT_ALREADY_PAID' } });
    });

    it('allows a retry after a FAILED payment', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(
        booking(payment({ status: 'FAILED' })),
      );
      m.paymentRepository.createForBooking.mockResolvedValue(payment({ status: 'PENDING' }));
      await expect(
        m.service.initForBooking('cust-1', 'bk-1', { method: 'COD' }),
      ).resolves.toMatchObject({ status: 'PENDING' });
    });

    it('404s on a foreign booking', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(null));
      await expect(
        m.service.initForBooking('intruder', 'bk-1', { method: 'COD' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('confirmForBooking', () => {
    const pendingWallet = () =>
      payment({
        method: 'SADAD',
        provider: 'PLUTU',
        status: 'PENDING',
        plutuRef: 'proc-1',
        rawPayload: { request: { method: 'SADAD', mobileNumber: '0913334444' } },
      });

    it('settles the payment on a correct OTP', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(pendingWallet()));
      m.plutu.confirmWallet.mockResolvedValue({ transactionRef: 'txn-9', raw: {} });
      m.paymentRepository.update.mockResolvedValue(
        payment({ method: 'SADAD', provider: 'PLUTU', status: 'SUCCESS', paidAt: new Date() }),
      );

      const dto = await m.service.confirmForBooking('cust-1', 'bk-1', { code: '123456' });

      expect(m.plutu.confirmWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          processId: 'proc-1',
          code: '123456',
          mobileNumber: '0913334444',
        }),
      );
      expect(dto.status).toBe('SUCCESS');
      expect(m.notificationService.notify).toHaveBeenCalled();
    });

    it('keeps the payment PENDING on a wrong OTP (recoverable)', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(booking(pendingWallet()));
      m.plutu.confirmWallet.mockRejectedValue(new PlutuError('OTP_INVALID', 'nope'));

      await expect(
        m.service.confirmForBooking('cust-1', 'bk-1', { code: '000000' }),
      ).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
      expect(m.paymentRepository.update).not.toHaveBeenCalled();
    });

    it('rejects confirming a COD payment (no OTP step)', async () => {
      const m = createMocks();
      m.paymentRepository.findBookingWithPayment.mockResolvedValue(
        booking(payment({ method: 'COD', provider: 'CASH', status: 'PENDING' })),
      );
      await expect(
        m.service.confirmForBooking('cust-1', 'bk-1', { code: '123456' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

import { Injectable } from '@nestjs/common';
import type { Payment, Prisma, ServiceBooking } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type BookingWithPayment = ServiceBooking & { payment: Payment | null };

export interface CreateBookingPaymentData {
  bookingId: string;
  amountLYD: Prisma.Decimal;
  method: Payment['method'];
  provider: Payment['provider'];
  status: Payment['status'];
  plutuRef?: string | null;
  rawPayload?: Prisma.InputJsonValue;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  findBookingWithPayment(bookingId: string): Promise<BookingWithPayment | null> {
    return this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
  }

  /** Creates the payment and links it to its booking atomically. */
  createForBooking(data: CreateBookingPaymentData): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amountLYD: data.amountLYD,
          method: data.method,
          provider: data.provider,
          status: data.status,
          plutuRef: data.plutuRef ?? null,
          rawPayload: data.rawPayload,
          relatedType: 'BOOKING',
          relatedId: data.bookingId,
        },
      });
      await tx.serviceBooking.update({
        where: { id: data.bookingId },
        data: { paymentId: payment.id },
      });
      return payment;
    });
  }

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput): Promise<Payment> {
    return this.prisma.payment.update({ where: { id }, data });
  }

  findUserContact(userId: string): Promise<{ id: string; phone: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });
  }

  /** The customer to notify about a payment (its booking's owner). */
  async findCustomerForPayment(payment: Payment): Promise<{ id: string; phone: string } | null> {
    if (payment.relatedType !== 'BOOKING') return null;
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: payment.relatedId },
      select: { customer: { select: { id: true, phone: true } } },
    });
    return booking?.customer ?? null;
  }
}

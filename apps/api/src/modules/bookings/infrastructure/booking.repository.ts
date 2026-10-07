import { Injectable } from '@nestjs/common';
import type {
  Address,
  Payment,
  Prisma,
  Review,
  Service,
  ServiceBooking,
  ServiceProvider,
  Vehicle,
  VehicleMake,
  VehicleModel,
} from '@prisma/client';

import { cursorArgs } from '../../../common/pagination';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type BookingWithRelations = ServiceBooking & {
  service: Service;
  vehicle: Vehicle & { make: VehicleMake; model: VehicleModel };
  address: Address;
  provider: (ServiceProvider & { user: { displayName: string; phone: string } }) | null;
  review: Review | null;
  payment: Payment | null;
};

const bookingInclude = {
  service: true,
  vehicle: { include: { make: true, model: true } },
  address: true,
  provider: { include: { user: { select: { displayName: true, phone: true } } } },
  review: true,
  payment: true,
} satisfies Prisma.ServiceBookingInclude;

export interface ListBookingsParams {
  customerId?: string;
  providerId?: string;
  status?: ServiceBooking['status'];
  cursor?: string;
  limit: number;
}

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ServiceBookingUncheckedCreateInput): Promise<BookingWithRelations> {
    return this.prisma.serviceBooking.create({ data, include: bookingInclude });
  }

  findById(id: string): Promise<BookingWithRelations | null> {
    return this.prisma.serviceBooking.findUnique({ where: { id }, include: bookingInclude });
  }

  /** Returns limit + 1 rows — the caller builds the page. Newest first. */
  list(params: ListBookingsParams): Promise<BookingWithRelations[]> {
    return this.prisma.serviceBooking.findMany({
      where: {
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.providerId ? { providerId: params.providerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: bookingInclude,
      ...cursorArgs(params.cursor, params.limit),
      orderBy: { id: 'desc' },
    });
  }

  update(
    id: string,
    data: Prisma.ServiceBookingUncheckedUpdateInput,
  ): Promise<BookingWithRelations> {
    return this.prisma.serviceBooking.update({ where: { id }, data, include: bookingInclude });
  }

  // ---- lookups the booking aggregate validates against ----

  findActiveService(id: string): Promise<Service | null> {
    return this.prisma.service.findFirst({ where: { id, isActive: true } });
  }

  findOwnedVehicle(id: string, userId: string): Promise<Vehicle | null> {
    return this.prisma.vehicle.findFirst({ where: { id, userId } });
  }

  findOwnedAddress(id: string, userId: string): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: { id, userId } });
  }

  findProvider(id: string): Promise<ServiceProvider | null> {
    return this.prisma.serviceProvider.findUnique({ where: { id } });
  }

  findProviderByUserId(userId: string): Promise<ServiceProvider | null> {
    return this.prisma.serviceProvider.findUnique({ where: { userId } });
  }

  findCustomerUser(id: string): Promise<{ id: string; phone: string } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, phone: true } });
  }

  // ---- reviews ----

  /** Creates the review and refreshes the provider's average rating atomically. */
  createReviewAndRecomputeRating(data: {
    bookingId: string;
    customerId: string;
    rating: number;
    body?: string;
    providerId: string | null;
  }): Promise<Review> {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          rating: data.rating,
          body: data.body,
        },
      });
      if (data.providerId) {
        const average = await tx.review.aggregate({
          where: { booking: { providerId: data.providerId } },
          _avg: { rating: true },
        });
        await tx.serviceProvider.update({
          where: { id: data.providerId },
          data: { rating: average._avg.rating ?? null },
        });
      }
      return review;
    });
  }
}

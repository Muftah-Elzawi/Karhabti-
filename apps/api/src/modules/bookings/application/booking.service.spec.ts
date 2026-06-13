import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { NotificationService } from '../../notifications/application/notification.service';
import type { BookingRepository, BookingWithRelations } from '../infrastructure/booking.repository';
import { BookingService } from './booking.service';

const service = {
  id: 'svc-1',
  categoryId: 'cat-1',
  nameAr: 'غسيل شامل',
  nameEn: 'Full wash',
  descriptionAr: 'وصف',
  descriptionEn: 'Description',
  basePriceLYD: new Prisma.Decimal('40.00'),
  durationMinutes: 50,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const bookingRow = (overrides: Partial<BookingWithRelations> = {}): BookingWithRelations =>
  ({
    id: 'bk-1',
    customerId: 'cust-1',
    providerId: null,
    serviceId: service.id,
    vehicleId: 'veh-1',
    addressId: 'addr-1',
    scheduledFor: new Date(Date.now() + 86_400_000),
    status: 'PENDING',
    priceLYD: new Prisma.Decimal('40.00'),
    paymentId: null,
    notes: null,
    confirmedAt: null,
    inProgressAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    service,
    vehicle: {
      id: 'veh-1',
      userId: 'cust-1',
      makeId: 'mk',
      modelId: 'md',
      year: 2018,
      engine: null,
      nickname: null,
      plateNumber: null,
      mileageKm: 1000,
      color: null,
      photoUrl: null,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      make: { id: 'mk', name: 'Toyota', slug: 'toyota', createdAt: new Date() },
      model: { id: 'md', makeId: 'mk', name: 'Corolla', slug: 'corolla', createdAt: new Date() },
    },
    address: {
      id: 'addr-1',
      userId: 'cust-1',
      label: 'المنزل',
      governorate: 'tripoli',
      city: 'tripoli',
      area: 'قرقارش',
      details: null,
      lat: null,
      lng: null,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    provider: null,
    review: null,
    payment: null,
    ...overrides,
  }) as BookingWithRelations;

describe('BookingService', () => {
  const createMocks = () => {
    const bookingRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      findActiveService: jest.fn(),
      findOwnedVehicle: jest.fn(),
      findOwnedAddress: jest.fn(),
      createReviewAndRecomputeRating: jest.fn(),
    };
    const notifications = { notify: jest.fn() };
    const auditLog = { append: jest.fn() };
    const bookingService = new BookingService(
      bookingRepository as unknown as BookingRepository,
      notifications as unknown as NotificationService,
      auditLog as unknown as AuditLogRepository,
    );
    return { bookingRepository, notifications, auditLog, bookingService };
  };

  const createInput = {
    serviceId: 'svc-1',
    vehicleId: 'veh-1',
    addressId: 'addr-1',
    scheduledFor: new Date(Date.now() + 86_400_000),
  };

  describe('create', () => {
    it('snapshots the service price into the booking', async () => {
      const m = createMocks();
      m.bookingRepository.findActiveService.mockResolvedValue(service);
      m.bookingRepository.findOwnedVehicle.mockResolvedValue({ id: 'veh-1' });
      m.bookingRepository.findOwnedAddress.mockResolvedValue({ id: 'addr-1' });
      m.bookingRepository.create.mockResolvedValue(bookingRow());

      const dto = await m.bookingService.create('cust-1', createInput, 'ar');

      expect(m.bookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ priceLYD: service.basePriceLYD }),
      );
      expect(dto.priceLYD).toBe('40.00');
      expect(dto.status).toBe('PENDING');
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking.create' }),
      );
    });

    it("rejects someone else's vehicle or address as missing", async () => {
      const m = createMocks();
      m.bookingRepository.findActiveService.mockResolvedValue(service);
      m.bookingRepository.findOwnedVehicle.mockResolvedValue(null);

      await expect(m.bookingService.create('cust-1', createInput, 'ar')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects an inactive service', async () => {
      const m = createMocks();
      m.bookingRepository.findActiveService.mockResolvedValue(null);
      await expect(m.bookingService.create('cust-1', createInput, 'ar')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('cancels a PENDING booking and notifies the assigned provider', async () => {
      const m = createMocks();
      const assigned = bookingRow({
        providerId: 'prov-1',
        provider: {
          id: 'prov-1',
          userId: 'prov-user-1',
          businessName: 'غسيل الصقر',
          governorate: 'tripoli',
          serviceAreas: [],
          rating: null,
          isVerified: true,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { displayName: 'صالح', phone: '0923456789' },
        } as BookingWithRelations['provider'],
      });
      m.bookingRepository.findById.mockResolvedValue(assigned);
      m.bookingRepository.update.mockResolvedValue(bookingRow({ status: 'CANCELLED' }));

      await m.bookingService.cancel('cust-1', 'bk-1', { reason: 'تغيرت خططي' }, 'ar');

      expect(m.notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'prov-user-1' }),
      );
    });

    it('refuses to cancel an IN_PROGRESS booking', async () => {
      const m = createMocks();
      m.bookingRepository.findById.mockResolvedValue(bookingRow({ status: 'IN_PROGRESS' }));
      await expect(m.bookingService.cancel('cust-1', 'bk-1', {}, 'ar')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("treats another customer's booking as missing", async () => {
      const m = createMocks();
      m.bookingRepository.findById.mockResolvedValue(bookingRow({ customerId: 'someone-else' }));
      await expect(m.bookingService.cancel('cust-1', 'bk-1', {}, 'ar')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('review', () => {
    it('reviews a COMPLETED booking and recomputes the provider rating', async () => {
      const m = createMocks();
      m.bookingRepository.findById
        .mockResolvedValueOnce(bookingRow({ status: 'COMPLETED', providerId: 'prov-1' }))
        .mockResolvedValueOnce(
          bookingRow({
            status: 'COMPLETED',
            review: {
              id: 'rev-1',
              bookingId: 'bk-1',
              customerId: 'cust-1',
              rating: 5,
              body: null,
              createdAt: new Date(),
            },
          }),
        );

      const dto = await m.bookingService.review('cust-1', 'bk-1', { rating: 5 }, 'ar');

      expect(m.bookingRepository.createReviewAndRecomputeRating).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'prov-1', rating: 5 }),
      );
      expect(dto.review?.rating).toBe(5);
    });

    it('refuses to review a non-completed booking', async () => {
      const m = createMocks();
      m.bookingRepository.findById.mockResolvedValue(bookingRow({ status: 'CONFIRMED' }));
      await expect(
        m.bookingService.review('cust-1', 'bk-1', { rating: 5 }, 'ar'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a second review', async () => {
      const m = createMocks();
      m.bookingRepository.findById.mockResolvedValue(
        bookingRow({
          status: 'COMPLETED',
          review: {
            id: 'rev-1',
            bookingId: 'bk-1',
            customerId: 'cust-1',
            rating: 4,
            body: null,
            createdAt: new Date(),
          },
        }),
      );
      await expect(
        m.bookingService.review('cust-1', 'bk-1', { rating: 5 }, 'ar'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

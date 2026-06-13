import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Address } from '@prisma/client';

import { createAddressSchema, updateAddressSchema } from '@karhabti/validation';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { AddressRepository } from '../infrastructure/address.repository';
import { AddressService } from './address.service';

const addressRow = (overrides: Partial<Address> = {}): Address => ({
  id: 'addr-1',
  userId: 'user-1',
  label: 'المنزل',
  governorate: 'tripoli',
  city: 'tripoli',
  area: 'قرقارش',
  details: null,
  lat: null,
  lng: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createInput = {
  label: 'المنزل',
  governorate: 'tripoli' as const,
  city: 'tripoli',
  area: 'قرقارش',
};

describe('address schemas', () => {
  it('rejects a city outside the governorate', () => {
    const result = createAddressSchema.safeParse({ ...createInput, city: 'benghazi' });
    expect(result.success).toBe(false);
  });

  it('requires lat and lng together', () => {
    expect(createAddressSchema.safeParse({ ...createInput, lat: 32.88 }).success).toBe(false);
    expect(createAddressSchema.safeParse({ ...createInput, lat: 32.88, lng: 13.19 }).success).toBe(
      true,
    );
  });

  it('requires governorate and city together on update', () => {
    expect(updateAddressSchema.safeParse({ governorate: 'benghazi' }).success).toBe(false);
    expect(
      updateAddressSchema.safeParse({ governorate: 'benghazi', city: 'benghazi' }).success,
    ).toBe(true);
  });
});

describe('AddressService', () => {
  const createMocks = () => {
    const addressRepository = {
      listByUser: jest.fn(),
      findById: jest.fn(),
      countByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setDefault: jest.fn(),
      delete: jest.fn(),
    };
    const auditLog = { append: jest.fn() };
    const service = new AddressService(
      addressRepository as unknown as AddressRepository,
      auditLog as unknown as AuditLogRepository,
    );
    return { addressRepository, auditLog, service };
  };

  it('makes the first address the default and audits', async () => {
    const m = createMocks();
    m.addressRepository.countByUser.mockResolvedValue(0);
    m.addressRepository.create.mockResolvedValue(addressRow({ isDefault: true }));

    const dto = await m.service.create('user-1', createInput);

    expect(m.addressRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', isDefault: true }),
    );
    expect(dto.isDefault).toBe(true);
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'address.create' }),
    );
  });

  it("treats another user's address as missing", async () => {
    const m = createMocks();
    m.addressRepository.findById.mockResolvedValue(addressRow({ userId: 'someone-else' }));

    await expect(m.service.update('user-1', 'addr-1', { label: 'العمل' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(m.service.remove('user-1', 'addr-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(m.addressRepository.delete).not.toHaveBeenCalled();
  });

  it('setDefault delegates to the atomic transaction and audits', async () => {
    const m = createMocks();
    m.addressRepository.findById.mockResolvedValue(addressRow());
    m.addressRepository.setDefault.mockResolvedValue(addressRow({ isDefault: true }));

    const dto = await m.service.setDefault('user-1', 'addr-1');
    expect(m.addressRepository.setDefault).toHaveBeenCalledWith('user-1', 'addr-1');
    expect(dto.isDefault).toBe(true);
  });

  it('maps a booking FK violation on delete to 409 ADDRESS_IN_USE', async () => {
    const m = createMocks();
    m.addressRepository.findById.mockResolvedValue(addressRow());
    m.addressRepository.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(m.service.remove('user-1', 'addr-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes an unused address and audits', async () => {
    const m = createMocks();
    m.addressRepository.findById.mockResolvedValue(addressRow());
    m.addressRepository.delete.mockResolvedValue(undefined);

    await m.service.remove('user-1', 'addr-1');
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'address.delete' }),
    );
  });
});

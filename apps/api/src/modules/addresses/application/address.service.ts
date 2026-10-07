import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Address } from '@prisma/client';

import type { CreateAddressInput, UpdateAddressInput } from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { AddressRepository } from '../infrastructure/address.repository';

export interface AddressDto {
  id: string;
  label: string;
  governorate: string;
  city: string;
  area: string;
  details: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: Date;
}

function toAddressDto(address: Address): AddressDto {
  return {
    id: address.id,
    label: address.label,
    governorate: address.governorate,
    city: address.city,
    area: address.area,
    details: address.details,
    lat: address.lat,
    lng: address.lng,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
  };
}

@Injectable()
export class AddressService {
  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async list(userId: string): Promise<AddressDto[]> {
    const addresses = await this.addressRepository.listByUser(userId);
    return addresses.map(toAddressDto);
  }

  async create(userId: string, input: CreateAddressInput): Promise<AddressDto> {
    // The first saved address becomes the default automatically.
    const isFirst = (await this.addressRepository.countByUser(userId)) === 0;
    const address = await this.addressRepository.create({
      ...input,
      userId,
      isDefault: isFirst,
    });
    await this.auditLog.append({
      actorId: userId,
      action: 'address.create',
      entityType: 'Address',
      entityId: address.id,
      after: { label: address.label, governorate: address.governorate, area: address.area },
    });
    return toAddressDto(address);
  }

  async update(userId: string, addressId: string, input: UpdateAddressInput): Promise<AddressDto> {
    const before = await this.ownedAddress(userId, addressId);
    const address = await this.addressRepository.update(addressId, input);
    await this.auditLog.append({
      actorId: userId,
      action: 'address.update',
      entityType: 'Address',
      entityId: addressId,
      before: { label: before.label, area: before.area, details: before.details },
      after: { label: address.label, area: address.area, details: address.details },
    });
    return toAddressDto(address);
  }

  async setDefault(userId: string, addressId: string): Promise<AddressDto> {
    await this.ownedAddress(userId, addressId);
    const address = await this.addressRepository.setDefault(userId, addressId);
    await this.auditLog.append({
      actorId: userId,
      action: 'address.set_default',
      entityType: 'Address',
      entityId: addressId,
    });
    return toAddressDto(address);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.ownedAddress(userId, addressId);
    try {
      await this.addressRepository.delete(addressId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException({
          code: 'ADDRESS_IN_USE',
          message: 'This address is used by bookings and cannot be deleted',
        });
      }
      throw error;
    }
    await this.auditLog.append({
      actorId: userId,
      action: 'address.delete',
      entityType: 'Address',
      entityId: addressId,
      before: { label: address.label, governorate: address.governorate, area: address.area },
    });
  }

  /** Ownership check — a foreign address id behaves exactly like a missing one. */
  private async ownedAddress(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressRepository.findById(addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Unknown address' });
    }
    return address;
  }
}

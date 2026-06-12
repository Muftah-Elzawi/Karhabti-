import { Injectable } from '@nestjs/common';
import type { Address, Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<Address | null> {
    return this.prisma.address.findUnique({ where: { id } });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.address.count({ where: { userId } });
  }

  create(data: Prisma.AddressUncheckedCreateInput): Promise<Address> {
    return this.prisma.address.create({ data });
  }

  update(id: string, data: Prisma.AddressUncheckedUpdateInput): Promise<Address> {
    return this.prisma.address.update({ where: { id }, data });
  }

  /** Atomic: exactly one default per user. */
  setDefault(userId: string, addressId: string): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
      return tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    });
  }

  /** Throws Prisma P2003 when bookings still reference the address. */
  async delete(id: string): Promise<void> {
    await this.prisma.address.delete({ where: { id } });
  }
}

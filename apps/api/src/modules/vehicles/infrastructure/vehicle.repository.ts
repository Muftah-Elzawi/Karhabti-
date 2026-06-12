import { Injectable } from '@nestjs/common';
import type { Prisma, Vehicle, VehicleMake, VehicleModel } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type VehicleWithCatalog = Vehicle & { make: VehicleMake; model: VehicleModel };

const catalogInclude = { make: true, model: true };

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string): Promise<VehicleWithCatalog[]> {
    return this.prisma.vehicle.findMany({
      where: { userId },
      include: catalogInclude,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<VehicleWithCatalog | null> {
    return this.prisma.vehicle.findUnique({ where: { id }, include: catalogInclude });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.vehicle.count({ where: { userId } });
  }

  create(data: Prisma.VehicleUncheckedCreateInput): Promise<VehicleWithCatalog> {
    return this.prisma.vehicle.create({ data, include: catalogInclude });
  }

  update(id: string, data: Prisma.VehicleUncheckedUpdateInput): Promise<VehicleWithCatalog> {
    return this.prisma.vehicle.update({ where: { id }, data, include: catalogInclude });
  }

  /** Atomic: exactly one default per user. */
  setDefault(userId: string, vehicleId: string): Promise<VehicleWithCatalog> {
    return this.prisma.$transaction(async (tx) => {
      await tx.vehicle.updateMany({
        where: { userId, isDefault: true, NOT: { id: vehicleId } },
        data: { isDefault: false },
      });
      return tx.vehicle.update({
        where: { id: vehicleId },
        data: { isDefault: true },
        include: catalogInclude,
      });
    });
  }
}

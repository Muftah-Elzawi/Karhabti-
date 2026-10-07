import { Injectable } from '@nestjs/common';
import type { VehicleMake, VehicleModel } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type MakeWithModels = VehicleMake & { models: VehicleModel[] };
export type ModelWithMake = VehicleModel & { make: VehicleMake };

/** Read-only access to the seeded make/model catalog (cascading selectors). */
@Injectable()
export class VehicleCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listMakesWithModels(): Promise<MakeWithModels[]> {
    return this.prisma.vehicleMake.findMany({
      orderBy: { name: 'asc' },
      include: { models: { orderBy: { name: 'asc' } } },
    });
  }

  findModelById(modelId: string): Promise<ModelWithMake | null> {
    return this.prisma.vehicleModel.findUnique({
      where: { id: modelId },
      include: { make: true },
    });
  }
}

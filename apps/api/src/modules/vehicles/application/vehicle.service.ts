import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import type { CreateVehicleInput, UpdateVehicleInput } from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { MakeWithModels } from '../infrastructure/vehicle-catalog.repository';
import { VehicleCatalogRepository } from '../infrastructure/vehicle-catalog.repository';
import type { VehicleWithCatalog } from '../infrastructure/vehicle.repository';
import { VehicleRepository } from '../infrastructure/vehicle.repository';

export interface VehicleMakeDto {
  id: string;
  name: string;
  slug: string;
  models: { id: string; name: string; slug: string }[];
}

export interface VehicleDto {
  id: string;
  make: { id: string; name: string; slug: string };
  model: { id: string; name: string; slug: string };
  year: number;
  engine: string | null;
  nickname: string | null;
  plateNumber: string | null;
  mileageKm: number;
  color: string | null;
  photoUrl: string | null;
  isDefault: boolean;
  createdAt: Date;
}

function toVehicleDto(vehicle: VehicleWithCatalog): VehicleDto {
  return {
    id: vehicle.id,
    make: { id: vehicle.make.id, name: vehicle.make.name, slug: vehicle.make.slug },
    model: { id: vehicle.model.id, name: vehicle.model.name, slug: vehicle.model.slug },
    year: vehicle.year,
    engine: vehicle.engine,
    nickname: vehicle.nickname,
    plateNumber: vehicle.plateNumber,
    mileageKm: vehicle.mileageKm,
    color: vehicle.color,
    photoUrl: vehicle.photoUrl,
    isDefault: vehicle.isDefault,
    createdAt: vehicle.createdAt,
  };
}

function toMakeDto(make: MakeWithModels): VehicleMakeDto {
  return {
    id: make.id,
    name: make.name,
    slug: make.slug,
    models: make.models.map((model) => ({ id: model.id, name: model.name, slug: model.slug })),
  };
}

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly catalogRepository: VehicleCatalogRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async listMakes(): Promise<VehicleMakeDto[]> {
    const makes = await this.catalogRepository.listMakesWithModels();
    return makes.map(toMakeDto);
  }

  async myGarage(userId: string): Promise<VehicleDto[]> {
    const vehicles = await this.vehicleRepository.listByUser(userId);
    return vehicles.map(toVehicleDto);
  }

  async addVehicle(userId: string, input: CreateVehicleInput): Promise<VehicleDto> {
    await this.assertModelBelongsToMake(input.modelId, input.makeId);

    // The first car in the garage becomes the default automatically.
    const isFirst = (await this.vehicleRepository.countByUser(userId)) === 0;
    const vehicle = await this.vehicleRepository.create({
      ...input,
      userId,
      isDefault: isFirst,
    });

    await this.auditLog.append({
      actorId: userId,
      action: 'vehicle.create',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      after: {
        make: vehicle.make.slug,
        model: vehicle.model.slug,
        year: vehicle.year,
        mileageKm: vehicle.mileageKm,
      },
    });
    return toVehicleDto(vehicle);
  }

  async updateVehicle(
    userId: string,
    vehicleId: string,
    input: UpdateVehicleInput,
  ): Promise<VehicleDto> {
    const before = await this.ownedVehicle(userId, vehicleId);
    if (input.modelId && input.makeId) {
      await this.assertModelBelongsToMake(input.modelId, input.makeId);
    }

    const vehicle = await this.vehicleRepository.update(vehicleId, input);
    await this.auditLog.append({
      actorId: userId,
      action: 'vehicle.update',
      entityType: 'Vehicle',
      entityId: vehicleId,
      before: { mileageKm: before.mileageKm, modelId: before.modelId, year: before.year },
      after: { mileageKm: vehicle.mileageKm, modelId: vehicle.modelId, year: vehicle.year },
    });
    return toVehicleDto(vehicle);
  }

  async setDefault(userId: string, vehicleId: string): Promise<VehicleDto> {
    await this.ownedVehicle(userId, vehicleId);
    const vehicle = await this.vehicleRepository.setDefault(userId, vehicleId);
    await this.auditLog.append({
      actorId: userId,
      action: 'vehicle.set_default',
      entityType: 'Vehicle',
      entityId: vehicleId,
    });
    return toVehicleDto(vehicle);
  }

  /** Ownership check — a foreign vehicle id behaves exactly like a missing one. */
  private async ownedVehicle(userId: string, vehicleId: string): Promise<VehicleWithCatalog> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Unknown vehicle' });
    }
    return vehicle;
  }

  private async assertModelBelongsToMake(modelId: string, makeId: string): Promise<void> {
    const model = await this.catalogRepository.findModelById(modelId);
    if (!model) {
      throw new NotFoundException({ code: 'MODEL_NOT_FOUND', message: 'Unknown model' });
    }
    if (model.makeId !== makeId) {
      throw new HttpException(
        { code: 'MODEL_MAKE_MISMATCH', message: 'Model does not belong to the given make' },
        422,
      );
    }
  }
}

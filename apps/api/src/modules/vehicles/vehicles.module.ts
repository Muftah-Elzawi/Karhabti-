import { Module } from '@nestjs/common';

import { VehicleService } from './application/vehicle.service';
import { VehicleCatalogRepository } from './infrastructure/vehicle-catalog.repository';
import { VehicleRepository } from './infrastructure/vehicle.repository';
import { VehiclesController } from './presentation/vehicles.controller';

@Module({
  controllers: [VehiclesController],
  providers: [VehicleService, VehicleRepository, VehicleCatalogRepository],
  exports: [VehicleService],
})
export class VehiclesModule {}

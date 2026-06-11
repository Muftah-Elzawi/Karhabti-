import { Module } from '@nestjs/common';

import { HealthService } from './application/health.service';
import { HealthRepository } from './infrastructure/health.repository';
import { HealthController } from './presentation/health.controller';

@Module({
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class HealthModule {}

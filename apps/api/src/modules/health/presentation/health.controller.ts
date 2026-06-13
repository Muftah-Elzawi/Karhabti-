import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { HealthStatus } from '../application/health.service';
import { HealthService } from '../application/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Service health: API liveness and database connectivity' })
  @ApiOkResponse({ description: 'Health status in the standard response envelope' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}

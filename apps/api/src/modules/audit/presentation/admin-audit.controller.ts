import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ListAuditLogsQuery } from '@karhabti/validation';
import { listAuditLogsQuerySchema } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuditLogDto } from '../application/audit-admin.service';
import { AuditAdminService } from '../application/audit-admin.service';

@ApiTags('admin/audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditAdminService: AuditAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Audit trail, newest first (filter by entity)' })
  list(
    @Query(new ZodValidationPipe(listAuditLogsQuerySchema)) query: ListAuditLogsQuery,
  ): Promise<ApiEnvelope<AuditLogDto[], PageMeta>> {
    return this.auditAdminService.list(query);
  }
}

import { Module } from '@nestjs/common';

import { AuditAdminService } from './application/audit-admin.service';
import { AdminAuditController } from './presentation/admin-audit.controller';

/** Admin-facing read side of the audit trail (writes live in infrastructure/audit). */
@Module({
  controllers: [AdminAuditController],
  providers: [AuditAdminService],
})
export class AuditLogsModule {}

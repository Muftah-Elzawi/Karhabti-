import { Global, Module } from '@nestjs/common';

import { AuditLogRepository } from './audit-log.repository';

@Global()
@Module({
  providers: [AuditLogRepository],
  exports: [AuditLogRepository],
})
export class AuditModule {}

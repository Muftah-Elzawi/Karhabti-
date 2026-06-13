import { Module } from '@nestjs/common';

import { ProviderAdminService } from './application/provider-admin.service';
import { ProviderRepository } from './infrastructure/provider.repository';
import { ProviderAdminController } from './presentation/provider-admin.controller';

@Module({
  controllers: [ProviderAdminController],
  providers: [ProviderAdminService, ProviderRepository],
  exports: [ProviderAdminService],
})
export class ProvidersModule {}

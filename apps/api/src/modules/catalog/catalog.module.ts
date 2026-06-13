import { Module } from '@nestjs/common';

import { CatalogAdminService } from './application/catalog-admin.service';
import { CatalogService } from './application/catalog.service';
import { ServiceCategoryRepository } from './infrastructure/service-category.repository';
import { ServiceRepository } from './infrastructure/service.repository';
import { CatalogAdminController } from './presentation/catalog-admin.controller';
import { CatalogController } from './presentation/catalog.controller';

@Module({
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogService, CatalogAdminService, ServiceCategoryRepository, ServiceRepository],
  exports: [CatalogService],
})
export class CatalogModule {}

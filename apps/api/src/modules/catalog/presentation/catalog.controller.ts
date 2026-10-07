import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ListServicesQuery } from '@karhabti/validation';
import { listServicesQuerySchema } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { RequestLocale } from '../../../common/request-locale.decorator';
import type { ServiceCategoryDto, ServiceDto } from '../application/catalog.service';
import { CatalogService } from '../application/catalog.service';

@ApiTags('catalog')
@ApiHeader({ name: 'Accept-Language', description: 'ar (default) or en', required: false })
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('service-categories')
  @ApiOperation({ summary: 'Active service categories in display order' })
  listCategories(@RequestLocale() locale: RequestLocaleValue): Promise<ServiceCategoryDto[]> {
    return this.catalogService.listCategories(locale);
  }

  @Get('services')
  @ApiOperation({ summary: 'Active services (cursor-paginated, filterable by category slug)' })
  listServices(
    @Query(new ZodValidationPipe(listServicesQuerySchema)) query: ListServicesQuery,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<ServiceDto[], PageMeta>> {
    return this.catalogService.listServices(query, locale);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Service detail' })
  getService(
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<ServiceDto> {
    return this.catalogService.getService(id, locale);
  }
}

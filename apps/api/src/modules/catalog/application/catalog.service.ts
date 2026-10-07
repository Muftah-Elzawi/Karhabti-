import { Injectable, NotFoundException } from '@nestjs/common';
import type { Service, ServiceCategory } from '@prisma/client';

import type { ListServicesQuery } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { ServiceCategoryRepository } from '../infrastructure/service-category.repository';
import { ServiceRepository } from '../infrastructure/service.repository';

export interface ServiceCategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export interface ServiceDto {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceLYD: string;
  durationMinutes: number;
}

function toCategoryDto(category: ServiceCategory, locale: RequestLocaleValue): ServiceCategoryDto {
  return {
    id: category.id,
    slug: category.slug,
    name: locale === 'en' ? category.nameEn : category.nameAr,
    icon: category.icon,
    sortOrder: category.sortOrder,
  };
}

export function toServiceDto(service: Service, locale: RequestLocaleValue): ServiceDto {
  return {
    id: service.id,
    categoryId: service.categoryId,
    name: locale === 'en' ? service.nameEn : service.nameAr,
    description: locale === 'en' ? service.descriptionEn : service.descriptionAr,
    basePriceLYD: service.basePriceLYD.toFixed(2),
    durationMinutes: service.durationMinutes,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async listCategories(locale: RequestLocaleValue): Promise<ServiceCategoryDto[]> {
    const categories = await this.categoryRepository.listActive();
    return categories.map((category) => toCategoryDto(category, locale));
  }

  async listServices(
    query: ListServicesQuery,
    locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<ServiceDto[], PageMeta>> {
    let categoryId: string | undefined;
    if (query.category) {
      const category = await this.categoryRepository.findBySlug(query.category);
      if (!category || !category.isActive) {
        throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Unknown category' });
      }
      categoryId = category.id;
    }

    const rows = await this.serviceRepository.listActive({
      categoryId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), (service) => toServiceDto(service, locale));
  }

  async getService(id: string, locale: RequestLocaleValue): Promise<ServiceDto> {
    const service = await this.serviceRepository.findById(id);
    if (!service || !service.isActive) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Unknown service' });
    }
    return toServiceDto(service, locale);
  }
}

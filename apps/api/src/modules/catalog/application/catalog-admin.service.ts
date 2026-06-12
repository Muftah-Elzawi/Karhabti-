import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Service, ServiceCategory } from '@prisma/client';

import type {
  CreateServiceCategoryInput,
  CreateServiceInput,
  UpdateServiceCategoryInput,
  UpdateServiceInput,
} from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { ServiceCategoryRepository } from '../infrastructure/service-category.repository';
import { ServiceRepository } from '../infrastructure/service.repository';

/** Admin mutations — every change writes an AuditLog entry. */
@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async createCategory(
    actorId: string,
    input: CreateServiceCategoryInput,
  ): Promise<ServiceCategory> {
    const existing = await this.categoryRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'Category slug already exists' });
    }
    const category = await this.categoryRepository.create(input);
    await this.auditLog.append({
      actorId,
      action: 'catalog.category_create',
      entityType: 'ServiceCategory',
      entityId: category.id,
      after: { slug: category.slug, nameAr: category.nameAr, nameEn: category.nameEn },
    });
    return category;
  }

  async updateCategory(
    actorId: string,
    id: string,
    input: UpdateServiceCategoryInput,
  ): Promise<ServiceCategory> {
    const before = await this.categoryRepository.findById(id);
    if (!before) {
      throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Unknown category' });
    }
    if (input.slug && input.slug !== before.slug) {
      const existing = await this.categoryRepository.findBySlug(input.slug);
      if (existing) {
        throw new ConflictException({
          code: 'SLUG_TAKEN',
          message: 'Category slug already exists',
        });
      }
    }
    const category = await this.categoryRepository.update(id, input);
    await this.auditLog.append({
      actorId,
      action: 'catalog.category_update',
      entityType: 'ServiceCategory',
      entityId: id,
      before: { slug: before.slug, isActive: before.isActive, sortOrder: before.sortOrder },
      after: { slug: category.slug, isActive: category.isActive, sortOrder: category.sortOrder },
    });
    return category;
  }

  async createService(actorId: string, input: CreateServiceInput): Promise<Service> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Unknown category' });
    }
    const service = await this.serviceRepository.create(input);
    await this.auditLog.append({
      actorId,
      action: 'catalog.service_create',
      entityType: 'Service',
      entityId: service.id,
      after: {
        nameAr: service.nameAr,
        nameEn: service.nameEn,
        basePriceLYD: service.basePriceLYD.toFixed(2),
        durationMinutes: service.durationMinutes,
      },
    });
    return service;
  }

  async updateService(actorId: string, id: string, input: UpdateServiceInput): Promise<Service> {
    const before = await this.serviceRepository.findById(id);
    if (!before) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Unknown service' });
    }
    if (input.categoryId && input.categoryId !== before.categoryId) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category) {
        throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Unknown category' });
      }
    }
    const service = await this.serviceRepository.update(id, input);
    await this.auditLog.append({
      actorId,
      action: 'catalog.service_update',
      entityType: 'Service',
      entityId: id,
      before: { basePriceLYD: before.basePriceLYD.toFixed(2), isActive: before.isActive },
      after: { basePriceLYD: service.basePriceLYD.toFixed(2), isActive: service.isActive },
    });
    return service;
  }
}

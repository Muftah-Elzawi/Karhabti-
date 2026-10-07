import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { ServiceCategoryRepository } from '../infrastructure/service-category.repository';
import type { ServiceRepository } from '../infrastructure/service.repository';
import { CatalogAdminService } from './catalog-admin.service';

describe('CatalogAdminService', () => {
  const createMocks = () => {
    const categoryRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const serviceRepository = { findById: jest.fn(), create: jest.fn(), update: jest.fn() };
    const auditLog = { append: jest.fn() };
    const admin = new CatalogAdminService(
      categoryRepository as unknown as ServiceCategoryRepository,
      serviceRepository as unknown as ServiceRepository,
      auditLog as unknown as AuditLogRepository,
    );
    return { categoryRepository, serviceRepository, auditLog, admin };
  };

  const categoryInput = {
    slug: 'oil-change',
    nameAr: 'تغيير الزيت',
    nameEn: 'Oil change',
    sortOrder: 2,
  };

  it('creates a category and audits it', async () => {
    const m = createMocks();
    m.categoryRepository.findBySlug.mockResolvedValue(null);
    m.categoryRepository.create.mockResolvedValue({ id: 'cat-2', ...categoryInput });

    await m.admin.createCategory('admin-1', categoryInput);

    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'catalog.category_create',
        entityId: 'cat-2',
      }),
    );
  });

  it('rejects a duplicate category slug', async () => {
    const m = createMocks();
    m.categoryRepository.findBySlug.mockResolvedValue({ id: 'cat-1' });
    await expect(m.admin.createCategory('admin-1', categoryInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('creating a service requires an existing category', async () => {
    const m = createMocks();
    m.categoryRepository.findById.mockResolvedValue(null);
    await expect(
      m.admin.createService('admin-1', {
        categoryId: 'nope',
        nameAr: 'خدمة',
        nameEn: 'Service',
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
        basePriceLYD: '30.00',
        durationMinutes: 45,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a service with before/after audit snapshot', async () => {
    const m = createMocks();
    const row = {
      id: 's1',
      categoryId: 'cat-1',
      basePriceLYD: new Prisma.Decimal('25.00'),
      isActive: true,
    };
    m.serviceRepository.findById.mockResolvedValue(row);
    m.serviceRepository.update.mockResolvedValue({
      ...row,
      basePriceLYD: new Prisma.Decimal('35.00'),
    });

    await m.admin.updateService('admin-1', 's1', { basePriceLYD: '35.00' });

    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'catalog.service_update',
        before: expect.objectContaining({ basePriceLYD: '25.00' }),
        after: expect.objectContaining({ basePriceLYD: '35.00' }),
      }),
    );
  });
});

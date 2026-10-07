import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Service, ServiceCategory } from '@prisma/client';

import type { ServiceCategoryRepository } from '../infrastructure/service-category.repository';
import type { ServiceRepository } from '../infrastructure/service.repository';
import { CatalogService } from './catalog.service';

const category: ServiceCategory = {
  id: 'cat-1',
  slug: 'car-wash',
  nameAr: 'غسيل السيارات',
  nameEn: 'Car wash',
  icon: null,
  sortOrder: 1,
  isActive: true,
  createdAt: new Date(),
};

const service = (id: string): Service => ({
  id,
  categoryId: 'cat-1',
  nameAr: `خدمة ${id}`,
  nameEn: `Service ${id}`,
  descriptionAr: 'وصف',
  descriptionEn: 'Description',
  basePriceLYD: new Prisma.Decimal('25.5'),
  durationMinutes: 30,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CatalogService', () => {
  const createMocks = () => {
    const categoryRepository = {
      listActive: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
    };
    const serviceRepository = { listActive: jest.fn(), findById: jest.fn() };
    const catalog = new CatalogService(
      categoryRepository as unknown as ServiceCategoryRepository,
      serviceRepository as unknown as ServiceRepository,
    );
    return { categoryRepository, serviceRepository, catalog };
  };

  it('localizes categories by Accept-Language', async () => {
    const m = createMocks();
    m.categoryRepository.listActive.mockResolvedValue([category]);

    const [ar] = await m.catalog.listCategories('ar');
    const [en] = await m.catalog.listCategories('en');
    expect(ar?.name).toBe('غسيل السيارات');
    expect(en?.name).toBe('Car wash');
  });

  it('serializes money as a 2-decimal string, never a float', async () => {
    const m = createMocks();
    m.serviceRepository.findById.mockResolvedValue(service('s1'));

    const dto = await m.catalog.getService('s1', 'ar');
    expect(dto.basePriceLYD).toBe('25.50');
    expect(typeof dto.basePriceLYD).toBe('string');
  });

  it('paginates: limit+1 rows become hasMore + nextCursor', async () => {
    const m = createMocks();
    m.serviceRepository.listActive.mockResolvedValue([service('s1'), service('s2'), service('s3')]);

    const result = await m.catalog.listServices({ limit: 2 }, 'en');
    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ hasMore: true, nextCursor: 's2' });
  });

  it('reports the last page with hasMore false', async () => {
    const m = createMocks();
    m.serviceRepository.listActive.mockResolvedValue([service('s1')]);

    const result = await m.catalog.listServices({ limit: 2 }, 'en');
    expect(result.meta).toEqual({ hasMore: false, nextCursor: null });
  });

  it('resolves a category slug filter and 404s unknown slugs', async () => {
    const m = createMocks();
    m.categoryRepository.findBySlug.mockResolvedValue(category);
    m.serviceRepository.listActive.mockResolvedValue([]);

    await m.catalog.listServices({ limit: 10, category: 'car-wash' }, 'ar');
    expect(m.serviceRepository.listActive).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' }),
    );

    m.categoryRepository.findBySlug.mockResolvedValue(null);
    await expect(
      m.catalog.listServices({ limit: 10, category: 'nope' }, 'ar'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides inactive services from detail', async () => {
    const m = createMocks();
    m.serviceRepository.findById.mockResolvedValue({ ...service('s1'), isActive: false });
    await expect(m.catalog.getService('s1', 'ar')).rejects.toBeInstanceOf(NotFoundException);
  });
});

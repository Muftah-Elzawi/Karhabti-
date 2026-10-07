import { Injectable } from '@nestjs/common';
import type { Prisma, ServiceCategory } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ServiceCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: string): Promise<ServiceCategory | null> {
    return this.prisma.serviceCategory.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<ServiceCategory | null> {
    return this.prisma.serviceCategory.findUnique({ where: { slug } });
  }

  create(data: Prisma.ServiceCategoryUncheckedCreateInput): Promise<ServiceCategory> {
    return this.prisma.serviceCategory.create({ data });
  }

  update(id: string, data: Prisma.ServiceCategoryUncheckedUpdateInput): Promise<ServiceCategory> {
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }
}

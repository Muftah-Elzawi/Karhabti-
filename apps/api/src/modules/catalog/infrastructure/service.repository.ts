import { Injectable } from '@nestjs/common';
import type { Prisma, Service } from '@prisma/client';

import { cursorArgs } from '../../../common/pagination';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface ListActiveServicesParams {
  categoryId?: string;
  cursor?: string;
  limit: number;
}

@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns limit + 1 rows — the caller builds the page (common/pagination). */
  listActive(params: ListActiveServicesParams): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: { isActive: true, ...(params.categoryId ? { categoryId: params.categoryId } : {}) },
      ...cursorArgs(params.cursor, params.limit),
    });
  }

  findById(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({ where: { id } });
  }

  create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service> {
    return this.prisma.service.create({ data });
  }

  update(id: string, data: Prisma.ServiceUncheckedUpdateInput): Promise<Service> {
    return this.prisma.service.update({ where: { id }, data });
  }
}

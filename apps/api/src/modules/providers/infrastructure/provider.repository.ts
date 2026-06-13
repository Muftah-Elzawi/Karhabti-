import { Injectable } from '@nestjs/common';
import type { Prisma, ServiceProvider, User } from '@prisma/client';

import { cursorArgs } from '../../../common/pagination';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type ProviderWithUser = ServiceProvider & {
  user: Pick<User, 'id' | 'phone' | 'displayName'>;
};

const userSelect = { select: { id: true, phone: true, displayName: true } };

export interface ListProvidersParams {
  status?: ServiceProvider['status'];
  governorate?: string;
  cursor?: string;
  limit: number;
}

@Injectable()
export class ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns limit + 1 rows — the caller builds the page (common/pagination). */
  list(params: ListProvidersParams): Promise<ProviderWithUser[]> {
    return this.prisma.serviceProvider.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.governorate ? { governorate: params.governorate } : {}),
      },
      include: { user: userSelect },
      ...cursorArgs(params.cursor, params.limit),
    });
  }

  findById(id: string): Promise<ProviderWithUser | null> {
    return this.prisma.serviceProvider.findUnique({
      where: { id },
      include: { user: userSelect },
    });
  }

  findUserByPhone(
    phone: string,
  ): Promise<(User & { providerProfile: ServiceProvider | null }) | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      include: { providerProfile: true },
    });
  }

  /** Onboarding is atomic: profile creation + role upgrade together. */
  createWithRoleUpgrade(
    userId: string,
    data: Omit<Prisma.ServiceProviderUncheckedCreateInput, 'userId'>,
  ): Promise<ProviderWithUser> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: 'PROVIDER' } });
      return tx.serviceProvider.create({
        data: { ...data, userId },
        include: { user: userSelect },
      });
    });
  }

  update(id: string, data: Prisma.ServiceProviderUncheckedUpdateInput): Promise<ProviderWithUser> {
    return this.prisma.serviceProvider.update({
      where: { id },
      data,
      include: { user: userSelect },
    });
  }
}

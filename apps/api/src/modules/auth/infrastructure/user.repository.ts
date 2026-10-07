import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CreateUserData {
  phone: string;
  passwordHash: string;
  displayName: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateProfile(
    id: string,
    data: Partial<Pick<User, 'displayName' | 'email' | 'locale'>>,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /** Re-registration before verification: refresh credentials on the unverified row. */
  updateUnverified(id: string, data: Omit<CreateUserData, 'phone'>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  markPhoneVerified(id: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { isPhoneVerified: true } });
  }
}

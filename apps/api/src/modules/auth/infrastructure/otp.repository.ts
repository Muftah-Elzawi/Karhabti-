import { Injectable } from '@nestjs/common';
import type { OtpCode, OtpPurpose } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    phone: string;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<OtpCode> {
    return this.prisma.otpCode.create({ data });
  }

  /** The single currently-valid code for this phone+purpose, if any. */
  findActive(phone: string, purpose: OtpPurpose): Promise<OtpCode | null> {
    return this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(id: string): Promise<OtpCode> {
    return this.prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async consume(id: string): Promise<void> {
    await this.prisma.otpCode.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  /** Requesting a new code invalidates all previous active ones. */
  async invalidateActive(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.prisma.otpCode.updateMany({
      where: { phone, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}

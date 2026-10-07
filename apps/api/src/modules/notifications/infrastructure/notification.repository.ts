import { Injectable } from '@nestjs/common';
import type { Notification, Prisma } from '@prisma/client';

import { cursorArgs } from '../../../common/pagination';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  /** Returns limit + 1 rows — the caller builds the page. Newest first. */
  listByUser(userId: string, cursor: string | undefined, limit: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      ...cursorArgs(cursor, limit),
      orderBy: { id: 'desc' },
    });
  }

  findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markRead(id: string): Promise<void> {
    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
}

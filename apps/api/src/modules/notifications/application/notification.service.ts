import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification } from '@prisma/client';

import type { CursorQuery } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import { NotificationRepository } from '../infrastructure/notification.repository';

export interface NotifyInput {
  userId: string;
  type: string; // e.g. "booking-status"
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  deepLink?: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  isRead: boolean;
  deepLink: string | null;
  createdAt: Date;
}

function toDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    titleAr: notification.titleAr,
    titleEn: notification.titleEn,
    bodyAr: notification.bodyAr,
    bodyEn: notification.bodyEn,
    isRead: notification.isRead,
    deepLink: notification.deepLink,
    createdAt: notification.createdAt,
  };
}

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /** Fire-and-forget from business flows — a failed notification never breaks them. */
  async notify(input: NotifyInput): Promise<void> {
    await this.notificationRepository.create(input).catch(() => undefined);
  }

  async list(
    userId: string,
    query: CursorQuery,
  ): Promise<ApiEnvelope<NotificationDto[], PageMeta>> {
    const rows = await this.notificationRepository.listByUser(userId, query.cursor, query.limit);
    return pageEnvelope(buildPage(rows, query.limit), toDto);
  }

  async markRead(userId: string, id: string): Promise<void> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Unknown notification',
      });
    }
    await this.notificationRepository.markRead(id);
  }
}

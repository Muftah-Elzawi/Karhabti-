import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: string; // e.g. "auth.register", "booking.confirm"
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; displayName: true; phone: true } } };
}>;

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  cursor?: string;
  limit: number;
}

/**
 * Every state-changing action writes an AuditLog entry (CLAUDE.md).
 * Append-only; never throws into the caller's flow.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before,
        after: entry.after,
      },
    });
  }

  /** Newest-first cursor page — unlike catalog lists, the audit log reads backwards. */
  async list(filter: AuditLogFilter): Promise<AuditLogWithActor[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filter.entityType ? { entityType: filter.entityType } : {}),
        ...(filter.entityId ? { entityId: filter.entityId } : {}),
      },
      include: { actor: { select: { id: true, displayName: true, phone: true } } },
      take: filter.limit + 1,
      orderBy: { id: 'desc' },
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
  }
}

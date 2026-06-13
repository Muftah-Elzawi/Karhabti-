import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { ListAuditLogsQuery } from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import type { AuditLogWithActor } from '../../../infrastructure/audit/audit-log.repository';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  actor: { id: string; displayName: string; phone: string } | null;
  createdAt: Date;
}

function toAuditLogDto(row: AuditLogWithActor): AuditLogDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: row.before ?? null,
    after: row.after ?? null,
    actor: row.actor, // null for system actions
    createdAt: row.createdAt,
  };
}

/** Admin audit-log browsing — read-only over the append-only trail. */
@Injectable()
export class AuditAdminService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async list(query: ListAuditLogsQuery): Promise<ApiEnvelope<AuditLogDto[], PageMeta>> {
    const rows = await this.auditLogRepository.list({
      entityType: query.entityType,
      entityId: query.entityId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), toAuditLogDto);
  }
}

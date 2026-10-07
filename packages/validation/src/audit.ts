import { z } from 'zod';

import { cursorQuerySchema } from './catalog';

/** Admin audit-log browsing — filter by the audited entity. */
export const listAuditLogsQuerySchema = cursorQuerySchema.extend({
  entityType: z.string().trim().min(1).max(60).optional(),
  entityId: z.string().trim().min(1).max(60).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

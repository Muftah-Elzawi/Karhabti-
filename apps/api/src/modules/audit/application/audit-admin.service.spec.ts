import type {
  AuditLogRepository,
  AuditLogWithActor,
} from '../../../infrastructure/audit/audit-log.repository';
import { AuditAdminService } from './audit-admin.service';

const row = (id: string): AuditLogWithActor => ({
  id,
  actorId: 'admin-1',
  action: 'booking.assign',
  entityType: 'ServiceBooking',
  entityId: 'bk-1',
  before: { providerId: null },
  after: { providerId: 'prov-1' },
  createdAt: new Date('2026-06-01T10:00:00Z'),
  actor: { id: 'admin-1', displayName: 'مدير', phone: '0925550005' },
});

describe('AuditAdminService', () => {
  const createMocks = () => {
    const auditLogRepository = { list: jest.fn() };
    const service = new AuditAdminService(auditLogRepository as unknown as AuditLogRepository);
    return { auditLogRepository, service };
  };

  it('returns a newest-first page with actor details', async () => {
    const m = createMocks();
    m.auditLogRepository.list.mockResolvedValue([row('log-3'), row('log-2')]);

    const result = await m.service.list({ limit: 20 });

    expect(m.auditLogRepository.list).toHaveBeenCalledWith({
      entityType: undefined,
      entityId: undefined,
      cursor: undefined,
      limit: 20,
    });
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toMatchObject({
      id: 'log-3',
      action: 'booking.assign',
      actor: { displayName: 'مدير' },
    });
    expect(result.meta).toEqual({ hasMore: false, nextCursor: null });
  });

  it('paginates with the extra-row convention', async () => {
    const m = createMocks();
    m.auditLogRepository.list.mockResolvedValue([row('log-3'), row('log-2'), row('log-1')]);

    const result = await m.service.list({ limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ hasMore: true, nextCursor: 'log-2' });
  });

  it('forwards entity filters to the repository', async () => {
    const m = createMocks();
    m.auditLogRepository.list.mockResolvedValue([]);

    await m.service.list({
      limit: 20,
      entityType: 'ServiceProvider',
      entityId: 'prov-1',
    });

    expect(m.auditLogRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ServiceProvider', entityId: 'prov-1' }),
    );
  });

  it('keeps system actions (no actor) as actor: null', async () => {
    const m = createMocks();
    m.auditLogRepository.list.mockResolvedValue([{ ...row('log-1'), actorId: null, actor: null }]);

    const result = await m.service.list({ limit: 20 });
    expect(result.data?.[0]?.actor).toBeNull();
  });
});

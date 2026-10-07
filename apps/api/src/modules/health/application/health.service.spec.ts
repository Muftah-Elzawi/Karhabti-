import type { HealthRepository } from '../infrastructure/health.repository';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const createService = (databaseUp: boolean) => {
    const repository = {
      pingDatabase: jest.fn().mockResolvedValue(databaseUp),
    } as unknown as HealthRepository;
    return new HealthService(repository);
  };

  it('reports ok when the database responds', async () => {
    const result = await createService(true).check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports degraded when the database is unreachable', async () => {
    const result = await createService(false).check();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});

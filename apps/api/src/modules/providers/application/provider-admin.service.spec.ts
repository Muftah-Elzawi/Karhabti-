import { ConflictException, NotFoundException } from '@nestjs/common';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { ProviderRepository, ProviderWithUser } from '../infrastructure/provider.repository';
import { ProviderAdminService } from './provider-admin.service';

const providerRow: ProviderWithUser = {
  id: 'prov-1',
  userId: 'user-1',
  businessName: 'غسيل الصقر',
  governorate: 'tripoli',
  serviceAreas: ['قرقارش'],
  rating: null,
  isVerified: false,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-1', phone: '0923456789', displayName: 'صالح' },
};

describe('ProviderAdminService', () => {
  const createMocks = () => {
    const providerRepository = {
      list: jest.fn(),
      findById: jest.fn(),
      findUserByPhone: jest.fn(),
      createWithRoleUpgrade: jest.fn(),
      update: jest.fn(),
    };
    const auditLog = { append: jest.fn() };
    const admin = new ProviderAdminService(
      providerRepository as unknown as ProviderRepository,
      auditLog as unknown as AuditLogRepository,
    );
    return { providerRepository, auditLog, admin };
  };

  const createInput = {
    phone: '0923456789',
    businessName: 'غسيل الصقر',
    governorate: 'tripoli' as const,
    serviceAreas: ['قرقارش'],
  };

  it('onboards a registered user (role upgrade + profile + audit)', async () => {
    const m = createMocks();
    m.providerRepository.findUserByPhone.mockResolvedValue({
      id: 'user-1',
      role: 'CUSTOMER',
      providerProfile: null,
    });
    m.providerRepository.createWithRoleUpgrade.mockResolvedValue(providerRow);

    const dto = await m.admin.create('admin-1', createInput);

    expect(m.providerRepository.createWithRoleUpgrade).toHaveBeenCalledWith('user-1', {
      businessName: createInput.businessName,
      governorate: createInput.governorate,
      serviceAreas: createInput.serviceAreas,
    });
    expect(dto.status).toBe('PENDING');
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'provider.create' }),
    );
  });

  it('404s when the phone is not registered', async () => {
    const m = createMocks();
    m.providerRepository.findUserByPhone.mockResolvedValue(null);
    await expect(m.admin.create('admin-1', createInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409s when the user already has a provider profile', async () => {
    const m = createMocks();
    m.providerRepository.findUserByPhone.mockResolvedValue({
      id: 'user-1',
      role: 'PROVIDER',
      providerProfile: { id: 'prov-1' },
    });
    await expect(m.admin.create('admin-1', createInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to turn an admin into a provider', async () => {
    const m = createMocks();
    m.providerRepository.findUserByPhone.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      providerProfile: null,
    });
    await expect(m.admin.create('admin-1', createInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it('verify/suspend updates audit with before/after status', async () => {
    const m = createMocks();
    m.providerRepository.findById.mockResolvedValue(providerRow);
    m.providerRepository.update.mockResolvedValue({
      ...providerRow,
      status: 'ACTIVE',
      isVerified: true,
    });

    const dto = await m.admin.update('admin-1', 'prov-1', { status: 'ACTIVE', isVerified: true });

    expect(dto.status).toBe('ACTIVE');
    expect(m.auditLog.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'provider.update',
        before: { status: 'PENDING', isVerified: false },
        after: { status: 'ACTIVE', isVerified: true },
      }),
    );
  });

  it('paginates the provider list', async () => {
    const m = createMocks();
    m.providerRepository.list.mockResolvedValue([
      providerRow,
      { ...providerRow, id: 'prov-2' },
      { ...providerRow, id: 'prov-3' },
    ]);

    const result = await m.admin.list({ limit: 2 });
    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ hasMore: true, nextCursor: 'prov-2' });
  });
});

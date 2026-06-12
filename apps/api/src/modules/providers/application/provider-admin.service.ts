import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CreateProviderInput,
  ListProvidersQuery,
  UpdateProviderInput,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { buildPage, pageEnvelope } from '../../../common/pagination';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { ProviderWithUser } from '../infrastructure/provider.repository';
import { ProviderRepository } from '../infrastructure/provider.repository';

export interface ProviderDto {
  id: string;
  businessName: string;
  governorate: string;
  serviceAreas: string[];
  rating: string | null;
  isVerified: boolean;
  status: ProviderWithUser['status'];
  user: { id: string; phone: string; displayName: string };
  createdAt: Date;
}

function toProviderDto(provider: ProviderWithUser): ProviderDto {
  return {
    id: provider.id,
    businessName: provider.businessName,
    governorate: provider.governorate,
    serviceAreas: provider.serviceAreas,
    rating: provider.rating ? provider.rating.toFixed(2) : null,
    isVerified: provider.isVerified,
    status: provider.status,
    user: provider.user,
    createdAt: provider.createdAt,
  };
}

/** Admin provider management — onboarding, verification, suspension. */
@Injectable()
export class ProviderAdminService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async list(query: ListProvidersQuery): Promise<ApiEnvelope<ProviderDto[], PageMeta>> {
    const rows = await this.providerRepository.list({
      status: query.status,
      governorate: query.governorate,
      cursor: query.cursor,
      limit: query.limit,
    });
    return pageEnvelope(buildPage(rows, query.limit), toProviderDto);
  }

  async get(id: string): Promise<ProviderDto> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException({ code: 'PROVIDER_NOT_FOUND', message: 'Unknown provider' });
    }
    return toProviderDto(provider);
  }

  /** Onboards an already-registered user: role -> PROVIDER + business profile. */
  async create(actorId: string, input: CreateProviderInput): Promise<ProviderDto> {
    const user = await this.providerRepository.findUserByPhone(input.phone);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'No registered account for this phone — the provider must register first',
      });
    }
    if (user.providerProfile) {
      throw new ConflictException({
        code: 'PROVIDER_EXISTS',
        message: 'This user already has a provider profile',
      });
    }
    if (user.role === 'ADMIN') {
      throw new ConflictException({
        code: 'ADMIN_NOT_ALLOWED',
        message: 'Admin accounts cannot become providers',
      });
    }

    const provider = await this.providerRepository.createWithRoleUpgrade(user.id, {
      businessName: input.businessName,
      governorate: input.governorate,
      serviceAreas: input.serviceAreas,
    });
    await this.auditLog.append({
      actorId,
      action: 'provider.create',
      entityType: 'ServiceProvider',
      entityId: provider.id,
      after: {
        userId: user.id,
        businessName: provider.businessName,
        governorate: provider.governorate,
      },
    });
    return toProviderDto(provider);
  }

  async update(actorId: string, id: string, input: UpdateProviderInput): Promise<ProviderDto> {
    const before = await this.providerRepository.findById(id);
    if (!before) {
      throw new NotFoundException({ code: 'PROVIDER_NOT_FOUND', message: 'Unknown provider' });
    }
    const provider = await this.providerRepository.update(id, input);
    await this.auditLog.append({
      actorId,
      action: 'provider.update',
      entityType: 'ServiceProvider',
      entityId: id,
      before: { status: before.status, isVerified: before.isVerified },
      after: { status: provider.status, isVerified: provider.isVerified },
    });
    return toProviderDto(provider);
  }
}

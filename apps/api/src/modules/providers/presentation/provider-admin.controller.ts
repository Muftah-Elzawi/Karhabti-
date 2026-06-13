import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  CreateProviderInput,
  ListProvidersQuery,
  UpdateProviderInput,
} from '@karhabti/validation';
import {
  createProviderSchema,
  listProvidersQuerySchema,
  updateProviderSchema,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { ProviderDto } from '../application/provider-admin.service';
import { ProviderAdminService } from '../application/provider-admin.service';

@ApiTags('admin/providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/providers')
export class ProviderAdminController {
  constructor(private readonly providerAdminService: ProviderAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List providers (filter by status / governorate)' })
  list(
    @Query(new ZodValidationPipe(listProvidersQuerySchema)) query: ListProvidersQuery,
  ): Promise<ApiEnvelope<ProviderDto[], PageMeta>> {
    return this.providerAdminService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Provider detail' })
  get(@Param('id') id: string): Promise<ProviderDto> {
    return this.providerAdminService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Onboard a registered user as a provider' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createProviderSchema)) input: CreateProviderInput,
  ): Promise<ProviderDto> {
    return this.providerAdminService.create(user.id, input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update / verify / suspend a provider' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProviderSchema)) input: UpdateProviderInput,
  ): Promise<ProviderDto> {
    return this.providerAdminService.update(user.id, id, input);
  }
}

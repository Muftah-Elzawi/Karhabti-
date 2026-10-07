import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Service, ServiceCategory } from '@prisma/client';

import type {
  CreateServiceCategoryInput,
  CreateServiceInput,
  UpdateServiceCategoryInput,
  UpdateServiceInput,
} from '@karhabti/validation';
import {
  createServiceCategorySchema,
  createServiceSchema,
  updateServiceCategorySchema,
  updateServiceSchema,
} from '@karhabti/validation';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import { CatalogAdminService } from '../application/catalog-admin.service';

@ApiTags('admin/catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class CatalogAdminController {
  constructor(private readonly catalogAdminService: CatalogAdminService) {}

  @Post('service-categories')
  @ApiOperation({ summary: 'Create a service category' })
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createServiceCategorySchema)) input: CreateServiceCategoryInput,
  ): Promise<ServiceCategory> {
    return this.catalogAdminService.createCategory(user.id, input);
  }

  @Patch('service-categories/:id')
  @ApiOperation({ summary: 'Update / (de)activate a service category' })
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServiceCategorySchema)) input: UpdateServiceCategoryInput,
  ): Promise<ServiceCategory> {
    return this.catalogAdminService.updateCategory(user.id, id, input);
  }

  @Post('services')
  @ApiOperation({ summary: 'Create a service' })
  createService(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createServiceSchema)) input: CreateServiceInput,
  ): Promise<Service> {
    return this.catalogAdminService.createService(user.id, input);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Update / (de)activate a service' })
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) input: UpdateServiceInput,
  ): Promise<Service> {
    return this.catalogAdminService.updateService(user.id, id, input);
  }
}

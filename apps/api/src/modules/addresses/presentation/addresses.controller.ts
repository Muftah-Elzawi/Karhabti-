import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { CreateAddressInput, UpdateAddressInput } from '@karhabti/validation';
import { createAddressSchema, updateAddressSchema } from '@karhabti/validation';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { AddressDto } from '../application/address.service';
import { AddressService } from '../application/address.service';

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: 'My saved addresses (default first)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AddressDto[]> {
    return this.addressService.list(user.id);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Save an address (the first becomes the default)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAddressSchema)) input: CreateAddressInput,
  ): Promise<AddressDto> {
    return this.addressService.create(user.id, input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an address' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAddressSchema)) input: UpdateAddressInput,
  ): Promise<AddressDto> {
    return this.addressService.update(user.id, id, input);
  }

  @Post(':id/default')
  @HttpCode(200)
  @ApiOperation({ summary: 'Make this address the default' })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<AddressDto> {
    return this.addressService.setDefault(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an address (409 if bookings reference it)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.addressService.remove(user.id, id);
  }
}

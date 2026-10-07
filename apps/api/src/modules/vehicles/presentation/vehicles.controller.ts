import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { CreateVehicleInput, UpdateVehicleInput } from '@karhabti/validation';
import { createVehicleSchema, updateVehicleSchema } from '@karhabti/validation';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { VehicleDto, VehicleMakeDto } from '../application/vehicle.service';
import { VehicleService } from '../application/vehicle.service';

@ApiTags('vehicles')
@Controller()
export class VehiclesController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('vehicle-makes')
  @ApiOperation({ summary: 'Make → model catalog for cascading selectors' })
  listMakes(): Promise<VehicleMakeDto[]> {
    return this.vehicleService.listMakes();
  }

  @Get('vehicles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My garage (default vehicle first)' })
  myGarage(@CurrentUser() user: AuthenticatedUser): Promise<VehicleDto[]> {
    return this.vehicleService.myGarage(user.id);
  }

  @Post('vehicles')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a car (the first becomes the default)' })
  addVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createVehicleSchema)) input: CreateVehicleInput,
  ): Promise<VehicleDto> {
    return this.vehicleService.addVehicle(user.id, input);
  }

  @Patch('vehicles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a car (mileage, nickname, model+make pair, ...)' })
  updateVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) input: UpdateVehicleInput,
  ): Promise<VehicleDto> {
    return this.vehicleService.updateVehicle(user.id, id, input);
  }

  @Post('vehicles/:id/default')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Make this car the default' })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<VehicleDto> {
    return this.vehicleService.setDefault(user.id, id);
  }
}

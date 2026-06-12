import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  AdminBookingStatusInput,
  AssignBookingInput,
  ListBookingsQuery,
} from '@karhabti/validation';
import {
  adminBookingStatusSchema,
  assignBookingSchema,
  listBookingsQuerySchema,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { RequestLocale } from '../../../common/request-locale.decorator';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { BookingDto } from '../application/booking-dto';
import { BookingAdminService } from '../application/booking-admin.service';

@ApiTags('admin/bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookingAdminService: BookingAdminService) {}

  @Get()
  @ApiOperation({ summary: 'All bookings (filterable by status)' })
  list(
    @Query(new ZodValidationPipe(listBookingsQuerySchema)) query: ListBookingsQuery,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    return this.bookingAdminService.list(query, locale);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assign an ACTIVE+verified provider to a PENDING booking' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignBookingSchema)) input: AssignBookingInput,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingAdminService.assign(user.id, id, input, locale);
  }

  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Override the booking status (audited)' })
  overrideStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminBookingStatusSchema)) input: AdminBookingStatusInput,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingAdminService.overrideStatus(user.id, id, input, locale);
  }
}

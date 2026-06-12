import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ListBookingsQuery } from '@karhabti/validation';
import { listBookingsQuerySchema } from '@karhabti/validation';
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
import { BookingProviderService } from '../application/booking-provider.service';

@ApiTags('provider/bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROVIDER')
@Controller('provider/bookings')
export class ProviderBookingsController {
  constructor(private readonly bookingProviderService: BookingProviderService) {}

  @Get()
  @ApiOperation({ summary: 'My jobs (filterable by status)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listBookingsQuerySchema)) query: ListBookingsQuery,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    return this.bookingProviderService.myJobs(user.id, query, locale);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an assigned job (→ CONFIRMED)' })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingProviderService.act(user.id, id, 'accept', locale);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline an assigned job (back to the pool)' })
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingProviderService.act(user.id, id, 'decline', locale);
  }

  @Post(':id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start the job (→ IN_PROGRESS)' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingProviderService.act(user.id, id, 'start', locale);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete the job (→ COMPLETED)' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingProviderService.act(user.id, id, 'complete', locale);
  }
}

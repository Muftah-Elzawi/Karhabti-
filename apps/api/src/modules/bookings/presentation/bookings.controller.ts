import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  CancelBookingInput,
  CreateBookingInput,
  CreateReviewInput,
  ListBookingsQuery,
} from '@karhabti/validation';
import {
  cancelBookingSchema,
  createBookingSchema,
  createReviewSchema,
  listBookingsQuerySchema,
} from '@karhabti/validation';
import type { ApiEnvelope, PageMeta } from '@karhabti/types';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { RequestLocaleValue } from '../../../common/request-locale.decorator';
import { RequestLocale } from '../../../common/request-locale.decorator';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { BookingDto } from '../application/booking-dto';
import { BookingService } from '../application/booking.service';

@ApiTags('bookings')
@ApiBearerAuth()
@ApiHeader({ name: 'Accept-Language', description: 'ar (default) or en', required: false })
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Book a service (price snapshotted, status PENDING)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBookingSchema)) input: CreateBookingInput,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingService.create(user.id, input, locale);
  }

  @Get()
  @ApiOperation({ summary: 'My bookings (newest first, filterable by status)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listBookingsQuerySchema)) query: ListBookingsQuery,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<ApiEnvelope<BookingDto[], PageMeta>> {
    return this.bookingService.myBookings(user.id, query, locale);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Booking detail with status timeline' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingService.getBooking(user.id, id, locale);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel (PENDING or CONFIRMED only)' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelBookingSchema)) input: CancelBookingInput,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingService.cancel(user.id, id, input, locale);
  }

  @Post(':id/review')
  @HttpCode(201)
  @ApiOperation({ summary: 'Review a COMPLETED booking (once)' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createReviewSchema)) input: CreateReviewInput,
    @RequestLocale() locale: RequestLocaleValue,
  ): Promise<BookingDto> {
    return this.bookingService.review(user.id, id, input, locale);
  }
}

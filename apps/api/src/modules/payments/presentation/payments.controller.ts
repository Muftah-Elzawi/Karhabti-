import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import type { ConfirmPaymentInput, InitPaymentInput } from '@karhabti/validation';
import { confirmPaymentSchema, initPaymentSchema } from '@karhabti/validation';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../auth/domain/token-payload';
import type { PaymentDto } from '../application/payment-dto';
import { PaymentService } from '../application/payment.service';

/** Brake on OTP guessing: 10 confirm attempts / 15 min (on top of the wallet OTP's own expiry). */
const PAYMENT_OTP_THROTTLE = { default: { limit: 10, ttl: 15 * 60 * 1000 } };

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/payment')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Start payment for a booking (COD, or Sadad/Adfali → OTP)' })
  init(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body(new ZodValidationPipe(initPaymentSchema)) input: InitPaymentInput,
  ): Promise<PaymentDto> {
    return this.paymentService.initForBooking(user.id, bookingId, input);
  }

  @Post('confirm')
  @HttpCode(200)
  @Throttle(PAYMENT_OTP_THROTTLE)
  @ApiOperation({ summary: 'Confirm a wallet payment with the OTP' })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body(new ZodValidationPipe(confirmPaymentSchema)) input: ConfirmPaymentInput,
  ): Promise<PaymentDto> {
    return this.paymentService.confirmForBooking(user.id, bookingId, input);
  }
}

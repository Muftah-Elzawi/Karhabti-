import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaymentWebhookService } from '../application/payment-webhook.service';

/** Minimal shape of the raw-body-enabled request (main.ts sets rawBody: true). */
interface RawRequest {
  rawBody?: Buffer;
}

@ApiTags('payments')
@Controller('payments/webhook')
export class PaymentWebhookController {
  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post('plutu')
  @HttpCode(200)
  @ApiOperation({ summary: 'Plutu async callback (public, HMAC-signature verified)' })
  plutu(
    @Req() request: RawRequest,
    @Headers('x-plutu-signature') signature?: string,
  ): Promise<{ received: true }> {
    // Signature is checked against the RAW bytes — re-serializing would change them.
    const rawBody = request.rawBody?.toString('utf8') ?? '';
    return this.webhookService.handle(rawBody, signature);
  }
}

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { Env } from '../../config/env';
import type {
  ConfirmWalletParams,
  ConfirmWalletResult,
  InitWalletParams,
  InitWalletResult,
  PlutuGateway,
  RefundParams,
  RefundResult,
} from './plutu-gateway';
import { PlutuError } from './plutu-gateway';

/**
 * In-process Plutu sandbox: simulates the OTP wallet flow without any network
 * calls. Accepts PLUTU_SANDBOX_OTP as the only valid OTP. Webhook signatures
 * use HMAC-SHA256(rawBody, PLUTU_WEBHOOK_SECRET). NEVER selected when
 * PLUTU_MODE=live (see plutu.module.ts).
 */
@Injectable()
export class SandboxPlutuGateway implements PlutuGateway {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @InjectPinoLogger(SandboxPlutuGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  async initWallet(params: InitWalletParams): Promise<InitWalletResult> {
    const processId = `sbx_proc_${params.reference}`;
    this.logger.info(
      { method: params.method, mobileNumber: params.mobileNumber, processId },
      `Plutu sandbox: OTP "${this.otp}" sent to wallet (use it to confirm)`,
    );
    return { processId, raw: { sandbox: true, processId } };
  }

  async confirmWallet(params: ConfirmWalletParams): Promise<ConfirmWalletResult> {
    if (params.code !== this.otp) {
      throw new PlutuError('OTP_INVALID', 'The OTP code is incorrect');
    }
    const transactionRef = `sbx_txn_${randomUUID()}`;
    this.logger.info(
      { processId: params.processId, transactionRef },
      'Plutu sandbox: charge confirmed',
    );
    return { transactionRef, raw: { sandbox: true, transactionRef, status: 'SUCCESS' } };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refundRef = `sbx_refund_${randomUUID()}`;
    this.logger.info(
      { transactionRef: params.transactionRef, refundRef },
      'Plutu sandbox: refunded',
    );
    return { refundRef, raw: { sandbox: true, refundRef, status: 'REFUNDED' } };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    // timingSafeEqual throws on length mismatch — guard it first.
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private get otp(): string {
    return this.config.get('PLUTU_SANDBOX_OTP', { infer: true });
  }

  private get webhookSecret(): string {
    return this.config.get('PLUTU_WEBHOOK_SECRET', { infer: true });
  }
}

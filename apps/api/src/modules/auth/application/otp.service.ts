import { createHash, randomInt } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { OtpPurpose } from '@prisma/client';

import { SMS_SENDER, SmsSender } from '../../../infrastructure/sms/sms-sender';
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  otpSmsMessage,
} from '../domain/auth.constants';
import { OtpRepository } from '../infrastructure/otp.repository';

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export type OtpCheckResult = 'valid' | 'invalid' | 'expired' | 'too_many_attempts';

@Injectable()
export class OtpService {
  constructor(
    private readonly otpRepository: OtpRepository,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
  ) {}

  /** Invalidates previous codes, stores a fresh hashed code, and sends it by SMS. */
  async issue(phone: string, purpose: OtpPurpose): Promise<void> {
    const code = randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, '0');

    await this.otpRepository.invalidateActive(phone, purpose);
    await this.otpRepository.create({
      phone,
      codeHash: hashOtp(code),
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    await this.smsSender.send(phone, otpSmsMessage(code));
  }

  /** Checks a submitted code; consumes it when valid, counts attempts when not. */
  async check(phone: string, purpose: OtpPurpose, code: string): Promise<OtpCheckResult> {
    const active = await this.otpRepository.findActive(phone, purpose);
    if (!active) return 'expired';
    if (active.attempts >= OTP_MAX_ATTEMPTS) return 'too_many_attempts';

    if (active.codeHash !== hashOtp(code)) {
      const updated = await this.otpRepository.incrementAttempts(active.id);
      return updated.attempts >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid';
    }

    await this.otpRepository.consume(active.id);
    return 'valid';
  }
}

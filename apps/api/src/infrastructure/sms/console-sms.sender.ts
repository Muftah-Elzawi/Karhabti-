import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { SmsSender } from './sms-sender';

/**
 * Dev driver: writes the SMS to the structured log instead of sending it.
 * NEVER use in production — the env-driven driver selection lives in
 * sms.module.ts.
 */
@Injectable()
export class ConsoleSmsSender implements SmsSender {
  constructor(
    @InjectPinoLogger(ConsoleSmsSender.name)
    private readonly logger: PinoLogger,
  ) {}

  async send(phone: string, message: string): Promise<void> {
    this.logger.info({ phone, message }, 'SMS (console driver)');
  }
}

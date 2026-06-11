import { Global, Module } from '@nestjs/common';

import { ConsoleSmsSender } from './console-sms.sender';
import { SMS_SENDER } from './sms-sender';

/**
 * SMS provider selection. Currently only the console (dev) driver exists;
 * when the production provider is chosen (Twilio vs a Libyan gateway), add
 * its driver here and select it via env — consumers never change.
 */
@Global()
@Module({
  providers: [{ provide: SMS_SENDER, useClass: ConsoleSmsSender }],
  exports: [SMS_SENDER],
})
export class SmsModule {}

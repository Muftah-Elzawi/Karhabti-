/**
 * SMS delivery abstraction (KARHABTI_BUILD_PROMPT.md §2: provider behind an
 * interface). The real driver (Twilio or a Libyan gateway) plugs in here
 * without touching any business logic.
 */
export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

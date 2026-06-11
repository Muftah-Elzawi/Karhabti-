/** OTP policy — framework-free domain constants. */
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

/** SMS copy for the OTP message. */
// TODO: review Arabic copy
export const otpSmsMessage = (code: string): string =>
  `كرهبتي: رمز التحقق الخاص بك هو ${code}. صالح لمدة ${OTP_TTL_MINUTES} دقائق.`;

// TODO: review Arabic copy — placeholders pending native review.

/** Bilingual notification copy per payment event. */
export const PAYMENT_NOTIFICATIONS = {
  paid: {
    titleAr: 'تم استلام الدفع',
    titleEn: 'Payment received',
    bodyAr: 'تم تأكيد دفع حجزك بنجاح',
    bodyEn: 'Your booking payment was confirmed successfully',
  },
  failed: {
    titleAr: 'فشل الدفع',
    titleEn: 'Payment failed',
    bodyAr: 'تعذّر إتمام الدفع — يمكنك المحاولة مرة أخرى',
    bodyEn: 'We could not complete the payment — you can try again',
  },
  refunded: {
    titleAr: 'تم استرداد المبلغ',
    titleEn: 'Payment refunded',
    bodyAr: 'تم استرداد مبلغ حجزك',
    bodyEn: 'Your booking payment was refunded',
  },
} as const;

/** SMS copy (Arabic-first). */
// TODO: review Arabic copy
export const paymentSms = {
  otpSent: (): string => 'كرهبتي: تم إرسال رمز التحقق إلى محفظتك لإتمام الدفع.',
};

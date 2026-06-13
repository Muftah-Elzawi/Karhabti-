// TODO: review Arabic copy — placeholders pending native review.

/** Bilingual notification copy per booking event (stored on the Notification row). */
export const BOOKING_NOTIFICATIONS = {
  assigned_to_provider: {
    titleAr: 'مهمة جديدة',
    titleEn: 'New job',
    bodyAr: 'تم إسناد حجز جديد إليك — راجع طلباتك',
    bodyEn: 'A new booking was assigned to you — check your jobs',
  },
  assigned_customer: {
    titleAr: 'تم إسناد حجزك',
    titleEn: 'Provider assigned',
    bodyAr: 'تم اختيار مزوّد خدمة لحجزك وبانتظار تأكيده',
    bodyEn: 'A provider was assigned to your booking and will confirm shortly',
  },
  confirmed: {
    titleAr: 'تم تأكيد حجزك',
    titleEn: 'Booking confirmed',
    bodyAr: 'أكّد مزوّد الخدمة حجزك — سنراك في الموعد',
    bodyEn: 'The provider confirmed your booking — see you at the scheduled time',
  },
  in_progress: {
    titleAr: 'بدأ تنفيذ الخدمة',
    titleEn: 'Service started',
    bodyAr: 'بدأ مزوّد الخدمة العمل على سيارتك',
    bodyEn: 'The provider started working on your car',
  },
  completed: {
    titleAr: 'اكتملت الخدمة',
    titleEn: 'Service completed',
    bodyAr: 'اكتملت الخدمة — قيّم تجربتك',
    bodyEn: 'Your service is complete — rate your experience',
  },
  cancelled: {
    titleAr: 'تم إلغاء الحجز',
    titleEn: 'Booking cancelled',
    bodyAr: 'تم إلغاء حجزك',
    bodyEn: 'Your booking was cancelled',
  },
  declined_unassigned: {
    titleAr: 'إعادة إسناد حجزك',
    titleEn: 'Reassigning your booking',
    bodyAr: 'نبحث عن مزوّد خدمة آخر لحجزك',
    bodyEn: 'We are finding another provider for your booking',
  },
} as const;

export type BookingNotificationKey = keyof typeof BOOKING_NOTIFICATIONS;

/** SMS copy (Arabic-first, sent only on the milestones that matter). */
// TODO: review Arabic copy
export const bookingSms = {
  confirmed: (scheduledFor: Date): string =>
    `كرهبتي: تم تأكيد حجزك ليوم ${scheduledFor.toISOString().slice(0, 10)}.`,
  cancelled: (): string => 'كرهبتي: تم إلغاء حجزك.',
};

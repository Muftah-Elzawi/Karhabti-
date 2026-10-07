import type { Messages } from '@karhabti/i18n';

import type { BookingStatus } from '@/lib/api';

const STATUS_CLASS: Record<BookingStatus, string> = {
  PENDING: 'badge-pending',
  CONFIRMED: 'badge-confirmed',
  IN_PROGRESS: 'badge-progress',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
};

export function StatusBadge({ status, t }: { status: BookingStatus; t: Messages }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{t.bookings.status[status]}</span>;
}

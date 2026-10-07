import type { Messages } from '@karhabti/i18n';

import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@/lib/api';

const STATUS_CLASS: Record<BookingStatus, string> = {
  PENDING: 'bg-secondary text-secondary-foreground',
  CONFIRMED: 'bg-primary text-primary-foreground',
  IN_PROGRESS: 'bg-accent text-accent-foreground',
  COMPLETED: 'bg-success text-success-foreground',
  CANCELLED: 'bg-destructive text-destructive-foreground',
};

export function BookingStatusBadge({ status, t }: { status: BookingStatus; t: Messages }) {
  return (
    <Badge variant="outline" className={`border-transparent ${STATUS_CLASS[status]}`}>
      {t.bookings.status[status]}
    </Badge>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { EligibleProvider } from '@/components/bookings/booking-row-actions';
import { BookingRowActions } from '@/components/bookings/booking-row-actions';
import { PaymentCell } from '@/components/bookings/payment-cell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BookingDto, BookingStatus, ProviderDto } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';
import { cn } from '@/lib/utils';

export function generateMetadata(): Metadata {
  return { title: getMessages().admin.navBookings };
}

const STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const t = getMessages();
  const locale = getLocale();
  const status = STATUSES.find((value) => value === searchParams.status);

  let bookings: BookingDto[];
  let activeProviders: ProviderDto[];
  try {
    [bookings, activeProviders] = await Promise.all([
      apiFetchAuthed<BookingDto[]>(`/admin/bookings?limit=50${status ? `&status=${status}` : ''}`, {
        headers: { 'accept-language': locale },
      }),
      apiFetchAuthed<ProviderDto[]>('/admin/providers?status=ACTIVE&limit=50'),
    ]);
  } catch {
    redirect('/login');
  }

  // Assignment requires ACTIVE + verified (same rule the API enforces).
  const eligibleProviders: EligibleProvider[] = activeProviders
    .filter((provider) => provider.isVerified)
    .map((provider) => ({
      id: provider.id,
      businessName: provider.businessName,
      governorate: provider.governorate,
    }));

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t.admin.navBookings}</CardTitle>
        <nav className="flex flex-wrap items-center gap-1 pt-2">
          <FilterChip href="/bookings" active={!status}>
            {t.services.all}
          </FilterChip>
          {STATUSES.map((value) => (
            <FilterChip key={value} href={`/bookings?status=${value}`} active={status === value}>
              {t.bookings.status[value]}
            </FilterChip>
          ))}
        </nav>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.admin.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.booking.service}</TableHead>
                <TableHead>{t.bookings.scheduledFor}</TableHead>
                <TableHead>{t.booking.stepVehicle}</TableHead>
                <TableHead>{t.booking.stepAddress}</TableHead>
                <TableHead>{t.booking.price}</TableHead>
                <TableHead>{t.bookings.provider}</TableHead>
                <TableHead>{t.admin.payment}</TableHead>
                <TableHead>{t.admin.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.service.name}
                    <div className="pt-1">
                      <BookingStatusBadge status={booking.status} t={t} />
                    </div>
                    {booking.notes ? (
                      <p className="max-w-44 truncate pt-1 text-xs text-muted-foreground">
                        {t.admin.customerNotes}: {booking.notes}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <bdi dir="ltr">{dateFormat.format(new Date(booking.scheduledFor))}</bdi>
                  </TableCell>
                  <TableCell>{booking.vehicle.label}</TableCell>
                  <TableCell>
                    {booking.address.area} (
                    {t.locations[booking.address.governorate as 'tripoli' | 'benghazi'] ??
                      booking.address.governorate}
                    )
                  </TableCell>
                  <TableCell>
                    {booking.priceLYD} {t.services.lyd}
                  </TableCell>
                  <TableCell>
                    {booking.provider?.businessName ?? (
                      <span className="text-muted-foreground">{t.bookings.notAssigned}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentCell payment={booking.payment} t={t} />
                  </TableCell>
                  <TableCell>
                    <BookingRowActions booking={booking} providers={eligibleProviders} t={t} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:bg-secondary',
      )}
    >
      {children}
    </Link>
  );
}

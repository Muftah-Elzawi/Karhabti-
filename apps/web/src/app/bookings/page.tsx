import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StatusBadge } from '@/components/booking/status-badge';
import type { BookingDto } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';
import { getAccessToken } from '@/lib/session';

export function generateMetadata(): Metadata {
  return { title: getMessages().bookings.title };
}

export default async function BookingsPage() {
  if (!getAccessToken()) redirect('/login');

  const t = getMessages();
  const locale = getLocale();
  let bookings: BookingDto[];
  try {
    bookings = await apiFetchAuthed<BookingDto[]>('/bookings?limit=50', {
      headers: { 'accept-language': locale },
    });
  } catch {
    redirect('/login');
  }

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{t.bookings.title}</h1>
        <Link href="/" className="btn btn-ghost">
          {t.common.back}
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="tagline">{t.bookings.empty}</p>
          <Link className="btn btn-primary" href="/services">
            {t.bookings.browseCta}
          </Link>
        </div>
      ) : (
        <div className="card-list">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="card booking-card">
              <div>
                <h2 className="service-name">{booking.service.name}</h2>
                <p className="service-meta">
                  {booking.vehicle.label}
                  {' · '}
                  <bdi dir="ltr">{dateFormat.format(new Date(booking.scheduledFor))}</bdi>
                </p>
              </div>
              <StatusBadge status={booking.status} t={t} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

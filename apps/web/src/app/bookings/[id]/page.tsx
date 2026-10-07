import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CancelBookingButton, ReviewForm } from '@/components/booking/booking-actions';
import { PaymentSection } from '@/components/booking/payment-section';
import { StatusBadge } from '@/components/booking/status-badge';
import type { BookingDto } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';
import { getAccessToken } from '@/lib/session';

export function generateMetadata(): Metadata {
  return { title: getMessages().bookings.detailTitle };
}

const TIMELINE_ORDER = [
  'createdAt',
  'confirmedAt',
  'inProgressAt',
  'completedAt',
  'cancelledAt',
] as const;

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  if (!getAccessToken()) redirect('/login');

  const t = getMessages();
  const locale = getLocale();

  let booking: BookingDto;
  try {
    booking = await apiFetchAuthed<BookingDto>(`/bookings/${encodeURIComponent(params.id)}`, {
      headers: { 'accept-language': locale },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    redirect('/login');
  }

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const canReview = booking.status === 'COMPLETED' && !booking.review;

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{t.bookings.detailTitle}</h1>
        <Link href="/bookings" className="btn btn-ghost">
          {t.common.back}
        </Link>
      </div>

      <div className="card">
        <div className="page-head">
          <h2 className="service-name">{booking.service.name}</h2>
          <StatusBadge status={booking.status} t={t} />
        </div>

        <dl>
          <div className="profile-row">
            <dt>{t.bookings.scheduledFor}</dt>
            <dd>
              <bdi dir="ltr">{dateFormat.format(new Date(booking.scheduledFor))}</bdi>
            </dd>
          </div>
          <div className="profile-row">
            <dt>{t.booking.stepVehicle}</dt>
            <dd>{booking.vehicle.label}</dd>
          </div>
          <div className="profile-row">
            <dt>{t.booking.stepAddress}</dt>
            <dd>
              {booking.address.label} — {booking.address.area} (
              {t.locations[booking.address.governorate as 'tripoli' | 'benghazi'] ??
                booking.address.governorate}
              )
            </dd>
          </div>
          <div className="profile-row">
            <dt>{t.booking.price}</dt>
            <dd>
              {booking.priceLYD} {t.services.lyd}
            </dd>
          </div>
          <div className="profile-row">
            <dt>{t.bookings.provider}</dt>
            <dd>{booking.provider?.businessName ?? t.bookings.notAssigned}</dd>
          </div>
          {booking.cancellationReason ? (
            <div className="profile-row">
              <dt>{t.bookings.cancelledReason}</dt>
              <dd>{booking.cancellationReason}</dd>
            </div>
          ) : null}
        </dl>

        <ol className="timeline">
          {TIMELINE_ORDER.filter((key) => booking.timeline[key]).map((key) => (
            <li key={key} className="timeline-item">
              <span className="timeline-dot" aria-hidden />
              <span>{t.bookings.timeline[key]}</span>
              <time className="timeline-time" dir="ltr">
                {dateFormat.format(new Date(booking.timeline[key] as string))}
              </time>
            </li>
          ))}
        </ol>

        {booking.review ? (
          <div className="profile-row">
            <dt>{t.bookings.yourReview}</dt>
            <dd>
              {'★'.repeat(booking.review.rating)}
              {booking.review.body ? ` — ${booking.review.body}` : ''}
            </dd>
          </div>
        ) : null}

        {booking.status !== 'CANCELLED' ? (
          <PaymentSection bookingId={booking.id} payment={booking.payment} t={t} />
        ) : null}

        {canCancel ? <CancelBookingButton bookingId={booking.id} t={t} /> : null}
        {canReview ? <ReviewForm bookingId={booking.id} t={t} /> : null}
      </div>
    </main>
  );
}

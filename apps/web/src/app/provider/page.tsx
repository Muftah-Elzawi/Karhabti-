import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StatusBadge } from '@/components/booking/status-badge';
import { JobActions } from '@/components/provider/job-actions';
import type { BookingDto, BookingStatus } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';
import { getAccessToken } from '@/lib/session';

export function generateMetadata(): Metadata {
  return { title: getMessages().provider.jobsTitle };
}

const STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default async function ProviderJobsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  if (!getAccessToken()) redirect('/login');

  const t = getMessages();
  const locale = getLocale();
  const status = STATUSES.find((value) => value === searchParams.status);

  let jobs: BookingDto[];
  try {
    jobs = await apiFetchAuthed<BookingDto[]>(
      `/provider/bookings?limit=50${status ? `&status=${status}` : ''}`,
      { headers: { 'accept-language': locale } },
    );
  } catch (error) {
    // 403 = signed in but not a provider account — back to the home page.
    if (error instanceof ApiError && error.status === 403) redirect('/');
    redirect('/login');
  }

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{t.provider.jobsTitle}</h1>
        <Link href="/profile" className="btn btn-ghost">
          {t.auth.profileTitle}
        </Link>
      </div>

      <nav className="chip-row">
        <Link href="/provider" className={`chip ${status ? '' : 'chip-active'}`}>
          {t.provider.all}
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/provider?status=${value}`}
            className={`chip ${status === value ? 'chip-active' : ''}`}
          >
            {t.bookings.status[value]}
          </Link>
        ))}
      </nav>

      {jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="tagline">{t.provider.empty}</p>
        </div>
      ) : (
        <div className="card-list">
          {jobs.map((job) => (
            <article key={job.id} className="card">
              <div className="page-head">
                <h2 className="service-name">{job.service.name}</h2>
                <StatusBadge status={job.status} t={t} />
              </div>

              <dl>
                <div className="profile-row">
                  <dt>{t.provider.scheduledFor}</dt>
                  <dd>
                    <bdi dir="ltr">{dateFormat.format(new Date(job.scheduledFor))}</bdi>
                  </dd>
                </div>
                <div className="profile-row">
                  <dt>{t.provider.vehicle}</dt>
                  <dd>{job.vehicle.label}</dd>
                </div>
                <div className="profile-row">
                  <dt>{t.provider.address}</dt>
                  <dd>
                    {job.address.label} — {job.address.area} (
                    {t.locations[job.address.governorate as 'tripoli' | 'benghazi'] ??
                      job.address.governorate}
                    )
                  </dd>
                </div>
                <div className="profile-row">
                  <dt>{t.provider.price}</dt>
                  <dd>
                    {job.priceLYD} {t.services.lyd}
                  </dd>
                </div>
                {job.notes ? (
                  <div className="profile-row">
                    <dt>{t.provider.customerNotes}</dt>
                    <dd>{job.notes}</dd>
                  </div>
                ) : null}
              </dl>

              <JobActions bookingId={job.id} status={job.status} t={t} />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

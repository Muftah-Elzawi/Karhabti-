'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import type { BookingDto, BookingStatus } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from '@/components/auth/messages';

type JobAction = 'accept' | 'decline' | 'start' | 'complete';

export function JobActions({
  bookingId,
  status,
  t,
}: {
  bookingId: string;
  status: BookingStatus;
  t: Messages;
}) {
  const router = useRouter();
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(action: JobAction) {
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>(`/api/provider/bookings/${bookingId}/${action}`);
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    setConfirmingDecline(false);
    router.refresh();
  }

  if (status === 'COMPLETED' || status === 'CANCELLED') return null;

  return (
    <div className="quick-form">
      {error ? <p className="form-error">{error}</p> : null}

      {status === 'PENDING' && !confirmingDecline ? (
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => act('accept')}
          >
            {t.provider.accept}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-danger-text"
            disabled={busy}
            onClick={() => setConfirmingDecline(true)}
          >
            {t.provider.decline}
          </button>
        </div>
      ) : null}

      {status === 'PENDING' && confirmingDecline ? (
        <>
          <p className="tagline">{t.provider.declineHint}</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setConfirmingDecline(false)}
            >
              {t.common.back}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-danger-text"
              disabled={busy}
              onClick={() => act('decline')}
            >
              {t.provider.confirmDecline}
            </button>
          </div>
        </>
      ) : null}

      {status === 'CONFIRMED' ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => act('start')}
        >
          {t.provider.start}
        </button>
      ) : null}

      {status === 'IN_PROGRESS' ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => act('complete')}
        >
          {t.provider.complete}
        </button>
      ) : null}
    </div>
  );
}

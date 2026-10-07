'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import type { BookingDto } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from '@/components/auth/messages';

export function CancelBookingButton({ bookingId, t }: { bookingId: string; t: Messages }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>(`/api/bookings/${bookingId}/cancel`, {
      reason: reason.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setOpen(true)}>
        {t.bookings.cancelBooking}
      </button>
    );
  }

  return (
    <div className="quick-form">
      {error ? <p className="form-error">{error}</p> : null}
      <label className="field">
        <span className="field-label">{t.bookings.cancelReason}</span>
        <input
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          {t.common.back}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
          {t.bookings.confirmCancel}
        </button>
      </div>
    </div>
  );
}

export function ReviewForm({ bookingId, t }: { bookingId: string; t: Messages }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>(`/api/bookings/${bookingId}/review`, {
      rating,
      body: body.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.refresh();
  }

  return (
    <div className="quick-form">
      <h2 className="wizard-title">{t.bookings.reviewTitle}</h2>
      {error ? <p className="form-error">{error}</p> : null}

      <div className="stars" role="radiogroup" aria-label={t.bookings.reviewTitle}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            className={`star ${value <= rating ? 'star-active' : ''}`}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">{t.bookings.reviewBody}</span>
        <textarea
          className="input"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
        {t.bookings.submitReview}
      </button>
    </div>
  );
}

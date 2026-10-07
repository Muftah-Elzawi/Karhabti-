'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';
import { confirmPaymentSchema, initPaymentSchema } from '@karhabti/validation';

import { translateError } from '@/components/auth/messages';
import type { PaymentDto, PaymentMethod, PaymentStatus } from '@/lib/api';
import { postJson } from '@/lib/client-api';

type InitMethod = 'COD' | 'SADAD' | 'ADFALI';

interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  requiresOtp: boolean;
}

const METHOD_LABEL: Record<InitMethod, keyof Messages['payment']> = {
  COD: 'methodCOD',
  SADAD: 'methodSADAD',
  ADFALI: 'methodADFALI',
};

export function PaymentSection({
  bookingId,
  payment,
  t,
}: {
  bookingId: string;
  payment: PaymentSummary | null;
  t: Messages;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<InitMethod>('COD');
  const [mobileNumber, setMobileNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A wallet payment moves to the OTP step either because the server already
  // has one PENDING, or because we just initiated one this render.
  const [awaitingOtp, setAwaitingOtp] = useState(Boolean(payment?.requiresOtp));

  async function initiate() {
    setError(null);
    const parsed = initPaymentSchema.safeParse({
      method,
      mobileNumber: method === 'COD' ? undefined : mobileNumber.trim(),
    });
    if (!parsed.success) {
      setError(translateError(t.errors, parsed.error.issues[0]?.message ?? 'VALIDATION_ERROR'));
      return;
    }
    setBusy(true);
    const result = await postJson<PaymentDto>(`/api/bookings/${bookingId}/payment`, parsed.data);
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    if (result.data.requiresOtp) {
      setAwaitingOtp(true);
      return;
    }
    router.refresh();
  }

  async function confirm() {
    setError(null);
    const parsed = confirmPaymentSchema.safeParse({ code: code.trim() });
    if (!parsed.success) {
      setError(translateError(t.errors, parsed.error.issues[0]?.message ?? 'VALIDATION_ERROR'));
      return;
    }
    setBusy(true);
    const result = await postJson<PaymentDto>(
      `/api/bookings/${bookingId}/payment/confirm`,
      parsed.data,
    );
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.refresh();
  }

  // Settled states — just show the status, no actions.
  if (payment && payment.status === 'SUCCESS') {
    return <StatusLine label={t.payment.status} value={t.payment.statusPaid} tone="success" />;
  }
  if (payment && payment.status === 'REFUNDED') {
    return <StatusLine label={t.payment.status} value={t.payment.statusRefunded} />;
  }
  if (payment && payment.status === 'PENDING' && payment.method === 'COD') {
    return <StatusLine label={t.payment.status} value={t.payment.statusPendingCod} />;
  }

  // Wallet payment awaiting its OTP.
  if (awaitingOtp && payment?.status !== 'FAILED') {
    return (
      <div className="quick-form">
        <h2 className="wizard-title">{t.payment.title}</h2>
        {error ? <p className="form-error">{error}</p> : null}
        <p className="tagline">{t.payment.otpSentHint}</p>
        <label className="field">
          <span className="field-label">{t.payment.otpCode}</span>
          <input
            className="input"
            dir="ltr"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
          {t.payment.confirm}
        </button>
      </div>
    );
  }

  // No payment yet (or a failed one to retry) — choose a method.
  return (
    <div className="quick-form">
      <h2 className="wizard-title">{t.payment.title}</h2>
      {error ? <p className="form-error">{error}</p> : null}
      {payment?.status === 'FAILED' ? <p className="form-error">{t.payment.statusFailed}</p> : null}

      <div className="option-list" role="radiogroup" aria-label={t.payment.method}>
        {(['COD', 'SADAD', 'ADFALI'] as InitMethod[]).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            className={`option ${method === value ? 'option-active' : ''}`}
            onClick={() => setMethod(value)}
          >
            {t.payment[METHOD_LABEL[value]]}
          </button>
        ))}
      </div>

      {method !== 'COD' ? (
        <label className="field">
          <span className="field-label">{t.payment.walletNumber}</span>
          <input
            className="input"
            dir="ltr"
            inputMode="tel"
            placeholder={t.auth.phonePlaceholder}
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
          />
        </label>
      ) : null}

      <button type="button" className="btn btn-primary" disabled={busy} onClick={initiate}>
        {payment?.status === 'FAILED' ? t.payment.retry : t.payment.pay}
      </button>
    </div>
  );
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="profile-row">
      <dt>{label}</dt>
      <dd>{tone === 'success' ? <span className="badge-success">{value}</span> : value}</dd>
    </div>
  );
}

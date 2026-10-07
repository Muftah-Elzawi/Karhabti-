'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { verifyOtpSchema } from '@karhabti/validation';

import type { UserProfile } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import type { AuthMessages, ErrorMessages } from './messages';
import { translateError } from './messages';

export function VerifyForm({
  t,
  errorsT,
  phone,
  autoResend,
}: {
  t: AuthMessages;
  errorsT: ErrorMessages;
  phone: string;
  autoResend: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resendFired = useRef(false);

  // Arriving from login with an unverified phone: send a fresh code once.
  useEffect(() => {
    if (!autoResend || resendFired.current) return;
    resendFired.current = true;
    void postJson('/api/auth/otp/request', { phone }).then((result) => {
      if (result.ok) setNotice(t.otpResent);
    });
  }, [autoResend, phone, t.otpResent]);

  async function resend() {
    setFormError(null);
    const result = await postJson('/api/auth/otp/request', { phone });
    if (result.ok) setNotice(t.otpResent);
    else setFormError(translateError(errorsT, result.error.code));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const parsed = verifyOtpSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setFormError(translateError(errorsT, 'invalid_otp_code'));
      return;
    }
    setSubmitting(true);
    const result = await postJson<{ user: UserProfile }>('/api/auth/otp/verify', parsed.data);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(translateError(errorsT, result.error.code));
      return;
    }
    router.push('/profile');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p className="tagline">
        {t.verifyHint} <bdi dir="ltr">{phone}</bdi>
      </p>

      {formError ? <p className="form-error">{formError}</p> : null}
      {notice ? <p className="form-notice">{notice}</p> : null}

      <label className="field">
        <span className="field-label">{t.otpCode}</span>
        <input
          className="input"
          type="text"
          dir="ltr"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting || code.length !== 6}>
        {t.submitVerify}
      </button>
      <button className="btn btn-ghost" type="button" onClick={resend}>
        {t.resendOtp}
      </button>
    </form>
  );
}

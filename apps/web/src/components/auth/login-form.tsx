'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { FieldErrors } from '@karhabti/validation';
import { flattenFieldErrors, loginSchema } from '@karhabti/validation';

import type { UserProfile } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import type { AuthMessages, ErrorMessages } from './messages';
import { translateError } from './messages';

export function LoginForm({ t, errorsT }: { t: AuthMessages; errorsT: ErrorMessages }) {
  const router = useRouter();
  const [fields, setFields] = useState({ phone: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(fields);
    if (!parsed.success) {
      setFieldErrors(flattenFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const result = await postJson<{ user: UserProfile }>('/api/auth/login', parsed.data);
    setSubmitting(false);
    if (!result.ok) {
      if (result.error.code === 'PHONE_NOT_VERIFIED') {
        // Finish verification instead — ask the verify screen to send a code.
        router.push(`/verify?phone=${encodeURIComponent(parsed.data.phone)}&resend=1`);
        return;
      }
      setFormError(translateError(errorsT, result.error.code));
      return;
    }
    router.push('/profile');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError ? <p className="form-error">{formError}</p> : null}

      <label className="field">
        <span className="field-label">{t.phone}</span>
        <input
          className="input"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={t.phonePlaceholder}
          value={fields.phone}
          onChange={set('phone')}
        />
        {fieldErrors['phone'] ? (
          <span className="field-error">{translateError(errorsT, fieldErrors['phone'])}</span>
        ) : null}
      </label>

      <label className="field">
        <span className="field-label">{t.password}</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={fields.password}
          onChange={set('password')}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {t.submitLogin}
      </button>
    </form>
  );
}

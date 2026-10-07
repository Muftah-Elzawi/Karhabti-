'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { FieldErrors } from '@karhabti/validation';
import { flattenFieldErrors, libyanPhoneSchema, loginSchema } from '@karhabti/validation';

import type { UserProfile } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import type { AuthMessages, ErrorMessages } from './messages';
import { translateError } from './messages';

export function LoginForm({ t, errorsT }: { t: AuthMessages; errorsT: ErrorMessages }) {
  const router = useRouter();
  const [fields, setFields] = useState({ identifier: '', password: '' });
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
        // Resume verification — the API returns the account's phone (the
        // identifier may have been an email).
        const details = result.error.details as { phone?: string } | undefined;
        const phone =
          details?.phone ??
          (libyanPhoneSchema.safeParse(parsed.data.identifier).success
            ? parsed.data.identifier
            : null);
        if (phone) {
          router.push(`/verify?phone=${encodeURIComponent(phone)}&resend=1`);
          return;
        }
      }
      setFormError(translateError(errorsT, result.error.code));
      return;
    }
    // Providers land on their jobs board; everyone else on the profile.
    router.push(result.data.user.role === 'PROVIDER' ? '/provider' : '/profile');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError ? <p className="form-error">{formError}</p> : null}

      <label className="field">
        <span className="field-label">{t.identifier}</span>
        <input
          className="input"
          type="text"
          dir="ltr"
          autoComplete="username"
          placeholder={t.identifierPlaceholder}
          value={fields.identifier}
          onChange={set('identifier')}
        />
        {fieldErrors['identifier'] ? (
          <span className="field-error">{translateError(errorsT, fieldErrors['identifier'])}</span>
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

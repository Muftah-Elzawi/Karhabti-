'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { FieldErrors } from '@karhabti/validation';
import { flattenFieldErrors, registerSchema } from '@karhabti/validation';

import { postJson } from '@/lib/client-api';
import type { AuthMessages, ErrorMessages } from './messages';
import { translateError } from './messages';

export function RegisterForm({ t, errorsT }: { t: AuthMessages; errorsT: ErrorMessages }) {
  const router = useRouter();
  const [fields, setFields] = useState({ phone: '', displayName: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(fields);
    if (!parsed.success) {
      setFieldErrors(flattenFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const result = await postJson<{ phone: string }>('/api/auth/register', parsed.data);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(translateError(errorsT, result.error.code));
      return;
    }
    router.push(`/verify?phone=${encodeURIComponent(parsed.data.phone)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError ? <p className="form-error">{formError}</p> : null}

      <label className="field">
        <span className="field-label">{t.displayName}</span>
        <input
          className="input"
          type="text"
          autoComplete="name"
          value={fields.displayName}
          onChange={set('displayName')}
        />
        {fieldErrors['displayName'] ? (
          <span className="field-error">{translateError(errorsT, fieldErrors['displayName'])}</span>
        ) : null}
      </label>

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
          autoComplete="new-password"
          value={fields.password}
          onChange={set('password')}
        />
        {fieldErrors['password'] ? (
          <span className="field-error">{translateError(errorsT, fieldErrors['password'])}</span>
        ) : null}
      </label>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {t.submitRegister}
      </button>
    </form>
  );
}

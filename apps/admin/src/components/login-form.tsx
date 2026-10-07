'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';
import type { FieldErrors } from '@karhabti/validation';
import { flattenFieldErrors, loginSchema } from '@karhabti/validation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserProfile } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from './messages';

export function LoginForm({ t }: { t: Messages }) {
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
      setFormError(translateError(t.errors, result.error.code));
      return;
    }
    router.push('/bookings');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="identifier">{t.auth.identifier}</Label>
        <Input
          id="identifier"
          type="text"
          dir="ltr"
          autoComplete="username"
          placeholder={t.auth.identifierPlaceholder}
          value={fields.identifier}
          onChange={set('identifier')}
        />
        {fieldErrors['identifier'] ? (
          <p className="text-sm text-destructive">
            {translateError(t.errors, fieldErrors['identifier'])}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={fields.password}
          onChange={set('password')}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {t.auth.submitLogin}
      </Button>
    </form>
  );
}

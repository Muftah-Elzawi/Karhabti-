'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';
import type { FieldErrors, Governorate } from '@karhabti/validation';
import { createProviderSchema, flattenFieldErrors, governorates } from '@karhabti/validation';

import { translateError } from '@/components/messages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ProviderDto } from '@/lib/api';
import { postJson } from '@/lib/client-api';

export function OnboardProviderForm({ t }: { t: Messages }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({
    phone: '',
    businessName: '',
    governorate: 'tripoli' as Governorate,
    serviceAreas: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = createProviderSchema.safeParse({
      phone: fields.phone.trim(),
      businessName: fields.businessName,
      governorate: fields.governorate,
      serviceAreas: fields.serviceAreas
        .split(/[,،]/)
        .map((area) => area.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setFieldErrors(flattenFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const result = await postJson<ProviderDto>('/api/providers', parsed.data);
    setBusy(false);
    if (!result.ok) {
      setFormError(translateError(t.errors, result.error.code));
      return;
    }
    setFields({ phone: '', businessName: '', governorate: 'tripoli', serviceAreas: '' });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>{t.admin.onboardTitle}</Button>;
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <p className="text-sm text-muted-foreground sm:col-span-2">{t.admin.onboardHint}</p>
      {formError ? (
        <p className="text-sm font-medium text-destructive sm:col-span-2">{formError}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="provider-phone">{t.auth.phone}</Label>
        <Input
          id="provider-phone"
          dir="ltr"
          placeholder={t.auth.phonePlaceholder}
          value={fields.phone}
          onChange={(event) => setFields((prev) => ({ ...prev, phone: event.target.value }))}
        />
        {fieldErrors['phone'] ? (
          <p className="text-sm text-destructive">
            {translateError(t.errors, fieldErrors['phone'])}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider-name">{t.admin.businessName}</Label>
        <Input
          id="provider-name"
          value={fields.businessName}
          onChange={(event) => setFields((prev) => ({ ...prev, businessName: event.target.value }))}
        />
        {fieldErrors['businessName'] ? (
          <p className="text-sm text-destructive">
            {translateError(t.errors, fieldErrors['businessName'])}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider-governorate">{t.booking.governorate}</Label>
        <Select
          id="provider-governorate"
          value={fields.governorate}
          onChange={(event) =>
            setFields((prev) => ({ ...prev, governorate: event.target.value as Governorate }))
          }
        >
          {governorates.map((governorate) => (
            <option key={governorate} value={governorate}>
              {t.locations[governorate]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider-areas">{t.admin.serviceAreas}</Label>
        <Input
          id="provider-areas"
          value={fields.serviceAreas}
          onChange={(event) => setFields((prev) => ({ ...prev, serviceAreas: event.target.value }))}
        />
      </div>

      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={busy}>
          {t.common.add}
        </Button>
      </div>
    </form>
  );
}

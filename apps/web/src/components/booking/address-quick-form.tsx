'use client';

import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';
import type { Governorate } from '@karhabti/validation';
import { citiesByGovernorate, createAddressSchema, governorates } from '@karhabti/validation';

import type { AddressDto } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from '@/components/auth/messages';

export function AddressQuickForm({
  t,
  onCreated,
}: {
  t: Messages;
  onCreated: (address: AddressDto) => void;
}) {
  const [label, setLabel] = useState('');
  const [governorate, setGovernorate] = useState<Governorate>('tripoli');
  const [area, setArea] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Single city per governorate at launch — selected implicitly.
  const city = citiesByGovernorate[governorate][0];

  async function submit() {
    setError(null);
    const parsed = createAddressSchema.safeParse({
      label,
      governorate,
      city,
      area,
      details: details || undefined,
    });
    if (!parsed.success) {
      setError(translateError(t.errors, 'VALIDATION_ERROR'));
      return;
    }
    setBusy(true);
    const result = await postJson<AddressDto>('/api/addresses', parsed.data);
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    onCreated(result.data);
  }

  return (
    <div className="quick-form">
      {error ? <p className="form-error">{error}</p> : null}

      <label className="field">
        <span className="field-label">{t.booking.label}</span>
        <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">{t.booking.governorate}</span>
        <select
          className="input"
          value={governorate}
          onChange={(event) => setGovernorate(event.target.value as Governorate)}
        >
          {governorates.map((slug) => (
            <option key={slug} value={slug}>
              {t.locations[slug]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">{t.booking.area}</span>
        <input className="input" value={area} onChange={(event) => setArea(event.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">{t.booking.details}</span>
        <input
          className="input"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={busy || !label || !area}
      >
        {t.common.save}
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';
import { createVehicleSchema } from '@karhabti/validation';

import type { VehicleDto, VehicleMakeDto } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from '@/components/auth/messages';

export function VehicleQuickForm({
  makes,
  t,
  onCreated,
}: {
  makes: VehicleMakeDto[];
  t: Messages;
  onCreated: (vehicle: VehicleDto) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState(String(currentYear - 5));
  const [mileageKm, setMileageKm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const models = makes.find((make) => make.id === makeId)?.models ?? [];

  async function submit() {
    setError(null);
    const parsed = createVehicleSchema.safeParse({
      makeId,
      modelId,
      year: Number(year),
      mileageKm: Number(mileageKm),
    });
    if (!parsed.success) {
      setError(translateError(t.errors, 'VALIDATION_ERROR'));
      return;
    }
    setBusy(true);
    const result = await postJson<VehicleDto>('/api/vehicles', parsed.data);
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
        <span className="field-label">{t.booking.make}</span>
        <select
          className="input"
          value={makeId}
          onChange={(event) => {
            setMakeId(event.target.value);
            setModelId('');
          }}
        >
          <option value="" disabled />
          {makes.map((make) => (
            <option key={make.id} value={make.id}>
              {make.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">{t.booking.model}</span>
        <select
          className="input"
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          disabled={!makeId}
        >
          <option value="" disabled />
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">{t.booking.year}</span>
          <input
            className="input"
            type="number"
            dir="ltr"
            min={1980}
            max={currentYear + 1}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t.booking.mileageKm}</span>
          <input
            className="input"
            type="number"
            dir="ltr"
            min={0}
            value={mileageKm}
            onChange={(event) => setMileageKm(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={busy || !makeId || !modelId || !mileageKm}
      >
        {t.common.save}
      </button>
    </div>
  );
}

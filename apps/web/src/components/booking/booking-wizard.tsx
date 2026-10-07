'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import type { AddressDto, BookingDto, ServiceDto, VehicleDto, VehicleMakeDto } from '@/lib/api';
import { postJson } from '@/lib/client-api';
import { translateError } from '@/components/auth/messages';
import { AddressQuickForm } from './address-quick-form';
import { VehicleQuickForm } from './vehicle-quick-form';

type Step = 0 | 1 | 2 | 3;

function vehicleLabel(vehicle: VehicleDto): string {
  return vehicle.nickname ?? `${vehicle.make.name} ${vehicle.model.name} ${vehicle.year}`;
}

/** datetime-local needs a local-timezone string without seconds. */
function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function BookingWizard({
  service,
  vehicles: initialVehicles,
  addresses: initialAddresses,
  makes,
  t,
}: {
  service: ServiceDto;
  vehicles: VehicleDto[];
  addresses: AddressDto[];
  makes: VehicleMakeDto[];
  t: Messages;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [vehicleId, setVehicleId] = useState(initialVehicles.find((v) => v.isDefault)?.id ?? '');
  const [addressId, setAddressId] = useState(initialAddresses.find((a) => a.isDefault)?.id ?? '');
  const [scheduledFor, setScheduledFor] = useState(
    toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [notes, setNotes] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(initialVehicles.length === 0);
  const [showAddressForm, setShowAddressForm] = useState(initialAddresses.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const steps = [
    t.booking.stepVehicle,
    t.booking.stepAddress,
    t.booking.stepTime,
    t.booking.stepConfirm,
  ];
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedAddress = addresses.find((a) => a.id === addressId);
  const scheduledDate = new Date(scheduledFor);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>('/api/bookings', {
      serviceId: service.id,
      vehicleId,
      addressId,
      scheduledFor: scheduledDate.toISOString(),
      notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.push(`/bookings/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="card wizard">
      <ol className="wizard-steps">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`wizard-step ${index === step ? 'wizard-step-active' : ''} ${index < step ? 'wizard-step-done' : ''}`}
          >
            {label}
          </li>
        ))}
      </ol>

      {error ? <p className="form-error">{error}</p> : null}

      {step === 0 ? (
        <section>
          <h2 className="wizard-title">{t.booking.chooseVehicle}</h2>
          <div className="option-list">
            {vehicles.map((vehicle) => (
              <label
                key={vehicle.id}
                className={`option ${vehicleId === vehicle.id ? 'option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="vehicle"
                  checked={vehicleId === vehicle.id}
                  onChange={() => setVehicleId(vehicle.id)}
                />
                <span>{vehicleLabel(vehicle)}</span>
              </label>
            ))}
          </div>
          {showVehicleForm ? (
            <VehicleQuickForm
              makes={makes}
              t={t}
              onCreated={(vehicle) => {
                setVehicles((previous) => [...previous, vehicle]);
                setVehicleId(vehicle.id);
                setShowVehicleForm(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowVehicleForm(true)}
            >
              + {t.booking.addVehicle}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!vehicleId}
            onClick={() => setStep(1)}
          >
            {t.common.next}
          </button>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <h2 className="wizard-title">{t.booking.chooseAddress}</h2>
          <div className="option-list">
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`option ${addressId === address.id ? 'option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                />
                <span>
                  {address.label} — {address.area}
                </span>
              </label>
            ))}
          </div>
          {showAddressForm ? (
            <AddressQuickForm
              t={t}
              onCreated={(address) => {
                setAddresses((previous) => [...previous, address]);
                setAddressId(address.id);
                setShowAddressForm(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAddressForm(true)}
            >
              + {t.booking.addAddress}
            </button>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
              {t.common.back}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!addressId}
              onClick={() => setStep(2)}
            >
              {t.common.next}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 className="wizard-title">{t.booking.chooseTime}</h2>
          <p className="tagline">{t.booking.timeHint}</p>
          <label className="field">
            <input
              className="input"
              type="datetime-local"
              dir="ltr"
              min={toLocalInputValue(new Date())}
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </label>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
              {t.common.back}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!scheduledFor || scheduledDate.getTime() <= Date.now()}
              onClick={() => setStep(3)}
            >
              {t.common.next}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="wizard-title">{t.booking.summary}</h2>
          <dl>
            <div className="profile-row">
              <dt>{t.booking.service}</dt>
              <dd>{service.name}</dd>
            </div>
            <div className="profile-row">
              <dt>{t.booking.price}</dt>
              <dd>
                {service.basePriceLYD} {t.services.lyd}
              </dd>
            </div>
            <div className="profile-row">
              <dt>{t.booking.duration}</dt>
              <dd>
                {service.durationMinutes} {t.services.minutes}
              </dd>
            </div>
            <div className="profile-row">
              <dt>{t.booking.stepVehicle}</dt>
              <dd>{selectedVehicle ? vehicleLabel(selectedVehicle) : ''}</dd>
            </div>
            <div className="profile-row">
              <dt>{t.booking.stepAddress}</dt>
              <dd>{selectedAddress ? `${selectedAddress.label} — ${selectedAddress.area}` : ''}</dd>
            </div>
            <div className="profile-row">
              <dt>{t.bookings.scheduledFor}</dt>
              <dd>
                <bdi dir="ltr">{scheduledDate.toLocaleString()}</bdi>
              </dd>
            </div>
          </dl>

          <label className="field">
            <span className="field-label">{t.booking.notes}</span>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
              {t.common.back}
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
              {t.booking.confirmBooking}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

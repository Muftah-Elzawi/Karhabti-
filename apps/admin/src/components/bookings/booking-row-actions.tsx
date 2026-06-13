'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import { translateError } from '@/components/messages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { BookingDto, BookingStatus } from '@/lib/api';
import { postJson } from '@/lib/client-api';

const ALL_STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export interface EligibleProvider {
  id: string;
  businessName: string;
  governorate: string;
}

export function BookingRowActions({
  booking,
  providers,
  t,
}: {
  booking: BookingDto;
  providers: EligibleProvider[];
  t: Messages;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [reason, setReason] = useState('');

  const terminal = booking.status === 'COMPLETED' || booking.status === 'CANCELLED';
  const canAssign = booking.status === 'PENDING';
  const overrideTargets = ALL_STATUSES.filter((status) => status !== booking.status);

  async function assign() {
    if (!providerId) return;
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>(`/api/bookings/${booking.id}/assign`, { providerId });
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.refresh();
  }

  async function applyOverride() {
    if (!newStatus) return;
    setError(null);
    setBusy(true);
    const result = await postJson<BookingDto>(`/api/bookings/${booking.id}/status`, {
      status: newStatus,
      reason: reason.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    setOverriding(false);
    setNewStatus('');
    setReason('');
    router.refresh();
  }

  if (terminal) return null;

  return (
    <div className="flex min-w-48 flex-col gap-2">
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

      {canAssign ? (
        providers.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.admin.noEligibleProviders}</p>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              aria-label={t.admin.chooseProvider}
              className="h-8 text-xs"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.businessName}
                </option>
              ))}
            </Select>
            <Button size="sm" disabled={busy || !providerId} onClick={assign}>
              {t.admin.assign}
            </Button>
          </div>
        )
      ) : null}

      {overriding ? (
        <div className="flex flex-col gap-2">
          <Select
            aria-label={t.admin.newStatus}
            className="h-8 text-xs"
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value as BookingStatus)}
          >
            <option value="" disabled>
              {t.admin.newStatus}
            </option>
            {overrideTargets.map((status) => (
              <option key={status} value={status}>
                {t.bookings.status[status]}
              </option>
            ))}
          </Select>
          <Input
            className="h-8 text-xs"
            placeholder={t.admin.reason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setOverriding(false)}
            >
              {t.common.back}
            </Button>
            <Button size="sm" disabled={busy || !newStatus} onClick={applyOverride}>
              {t.admin.apply}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOverriding(true)}>
          {t.admin.overrideStatus}
        </Button>
      )}
    </div>
  );
}

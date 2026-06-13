'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import { translateError } from '@/components/messages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PaymentDto, PaymentStatus } from '@/lib/api';
import { postJson } from '@/lib/client-api';

const STATUS_CLASS: Record<PaymentStatus, string> = {
  INITIATED: 'bg-secondary text-secondary-foreground',
  PENDING: 'bg-secondary text-secondary-foreground',
  SUCCESS: 'bg-success text-success-foreground',
  FAILED: 'bg-destructive text-destructive-foreground',
  REFUNDED: 'bg-muted text-muted-foreground',
};

export function PaymentCell({
  payment,
  t,
}: {
  payment: { id: string; status: PaymentStatus; method: string } | null;
  t: Messages;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (!payment) return;
    setError(null);
    setBusy(true);
    const result = await postJson<PaymentDto>(`/api/payments/${payment.id}/refund`);
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!payment) {
    return <span className="text-xs text-muted-foreground">{t.admin.noPayment}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={`border-transparent ${STATUS_CLASS[payment.status]}`}>
        {t.admin.paymentStatus[payment.status]}
      </Badge>
      <span className="text-xs text-muted-foreground">{payment.method}</span>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

      {payment.status === 'SUCCESS' ? (
        confirming ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              {t.common.cancel}
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={refund}>
              {t.admin.confirmRefund}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            {t.admin.refund}
          </Button>
        )
      ) : null}
    </div>
  );
}

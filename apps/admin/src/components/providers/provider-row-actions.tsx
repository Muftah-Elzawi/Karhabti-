'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import { translateError } from '@/components/messages';
import { Button } from '@/components/ui/button';
import type { ProviderDto } from '@/lib/api';
import { patchJson } from '@/lib/client-api';

export function ProviderRowActions({ provider, t }: { provider: ProviderDto; t: Messages }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function update(input: { isVerified?: boolean; status?: ProviderDto['status'] }) {
    setError(null);
    setBusy(true);
    const result = await patchJson<ProviderDto>(`/api/providers/${provider.id}`, input);
    setBusy(false);
    if (!result.ok) {
      setError(translateError(t.errors, result.error.code));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex min-w-40 flex-col gap-2">
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => update({ isVerified: !provider.isVerified })}
        >
          {provider.isVerified ? t.admin.unverify : t.admin.verify}
        </Button>
        {provider.status === 'ACTIVE' ? (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => update({ status: 'SUSPENDED' })}
          >
            {t.admin.suspend}
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => update({ status: 'ACTIVE' })}>
            {t.admin.activate}
          </Button>
        )}
      </div>
    </div>
  );
}

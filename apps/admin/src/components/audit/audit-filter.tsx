'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import type { Messages } from '@karhabti/i18n';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Drives the audit list's entity filters via the URL query (server re-fetch). */
export function AuditFilter({ t }: { t: Messages }) {
  const router = useRouter();
  const params = useSearchParams();
  const [entityType, setEntityType] = useState(params.get('entityType') ?? '');
  const [entityId, setEntityId] = useState(params.get('entityId') ?? '');

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (entityType.trim()) next.set('entityType', entityType.trim());
    if (entityId.trim()) next.set('entityId', entityId.trim());
    const query = next.toString();
    router.push(query ? `/audit?${query}` : '/audit');
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-2">
      <Input
        className="h-8 w-44 text-xs"
        placeholder={t.admin.filterEntityType}
        value={entityType}
        onChange={(event) => setEntityType(event.target.value)}
      />
      <Input
        className="h-8 w-44 text-xs"
        dir="ltr"
        placeholder={t.admin.filterEntityId}
        value={entityId}
        onChange={(event) => setEntityId(event.target.value)}
      />
      <Button type="submit" size="sm">
        {t.admin.filter}
      </Button>
    </form>
  );
}

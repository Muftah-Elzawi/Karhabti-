'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { postJson } from '@/lib/client-api';

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await postJson('/api/auth/logout');
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" disabled={busy} onClick={logout}>
      {label}
    </Button>
  );
}

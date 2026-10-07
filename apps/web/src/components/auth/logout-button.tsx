'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { postJson } from '@/lib/client-api';

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await postJson('/api/auth/logout');
    router.push('/');
    router.refresh();
  }

  return (
    <button className="btn btn-primary" type="button" onClick={logout} disabled={busy}>
      {label}
    </button>
  );
}

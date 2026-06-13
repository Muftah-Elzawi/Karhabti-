import { NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api';
import { clearSessionCookies, getRefreshToken } from '@/lib/session';

export async function POST() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    // Best effort — the cookies are cleared regardless.
    await apiFetch<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearSessionCookies();
  return new NextResponse(null, { status: 204 });
}

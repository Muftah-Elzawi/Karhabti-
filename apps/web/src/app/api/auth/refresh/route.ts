import { NextResponse } from 'next/server';

import type { AuthTokens } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { errorJson } from '@/lib/bff';
import { clearSessionCookies, getRefreshToken, setSessionCookies } from '@/lib/session';

export async function POST() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return errorJson('UNAUTHORIZED', 401);

  try {
    const tokens = await apiFetch<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    setSessionCookies(tokens);
    return new NextResponse(null, { status: 204 });
  } catch {
    clearSessionCookies();
    return errorJson('UNAUTHORIZED', 401);
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookieOptions,
} from '@/lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Protects every dashboard page. When the short-lived access cookie is gone
 * but a refresh cookie exists, rotates the pair transparently so the page
 * render (and the admin) never notices the expiry.
 */
export async function middleware(request: NextRequest) {
  if (request.cookies.get(ACCESS_COOKIE)) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.redirect(loginUrl);

  try {
    const apiResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const envelope = (await apiResponse.json()) as {
      data: { accessToken: string; refreshToken: string } | null;
    };
    const tokens = envelope.data;
    if (!apiResponse.ok || !tokens?.accessToken) throw new Error('refresh failed');

    // Forward the fresh access token to THIS request's render as well.
    const headers = new Headers(request.headers);
    headers.set(
      'cookie',
      `${request.headers.get('cookie') ?? ''}; ${ACCESS_COOKIE}=${tokens.accessToken}`,
    );
    const response = NextResponse.next({ request: { headers } });
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, sessionCookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(
      REFRESH_COOKIE,
      tokens.refreshToken,
      sessionCookieOptions(REFRESH_MAX_AGE),
    );
    return response;
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(ACCESS_COOKIE, '', sessionCookieOptions(0));
    response.cookies.set(REFRESH_COOKIE, '', sessionCookieOptions(0));
    return response;
  }
}

export const config = {
  matcher: ['/', '/bookings/:path*', '/providers/:path*', '/audit/:path*'],
};

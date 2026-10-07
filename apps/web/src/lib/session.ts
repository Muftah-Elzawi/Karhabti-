import { cookies } from 'next/headers';

import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookieOptions,
} from './auth-cookies';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function setSessionCookies(tokens: SessionTokens): void {
  const store = cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, sessionCookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refreshToken, sessionCookieOptions(REFRESH_MAX_AGE));
}

export function clearSessionCookies(): void {
  const store = cookies();
  store.set(ACCESS_COOKIE, '', sessionCookieOptions(0));
  store.set(REFRESH_COOKIE, '', sessionCookieOptions(0));
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

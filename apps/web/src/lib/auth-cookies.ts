/**
 * Session cookie contract — shared by route handlers (lib/session.ts) and
 * the edge middleware. Tokens live in httpOnly cookies only; client JS never
 * sees them (BFF pattern).
 */
export const ACCESS_COOKIE = 'karhabti_access';
export const REFRESH_COOKIE = 'karhabti_refresh';

export const ACCESS_MAX_AGE = 15 * 60; // matches JWT_ACCESS_TTL
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // matches JWT_REFRESH_TTL_DAYS

/**
 * Secure (HTTPS-only) by default in production builds; COOKIE_SECURE=false
 * opts out for plain-HTTP smoke tests of the production server. Never set
 * it to false on a deployed environment.
 */
const secureCookies =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: secureCookies,
  path: '/',
  maxAge,
});

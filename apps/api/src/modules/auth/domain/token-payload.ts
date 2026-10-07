import type { UserRole } from '@prisma/client';

/** Claims carried by a short-lived access token. */
export interface AccessTokenPayload {
  sub: string; // user id
  phone: string;
  role: UserRole;
}

/** Claims carried by a refresh token; jti is the RefreshToken row id. */
export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // refresh token id (rotation + reuse detection)
}

/** Shape attached to req.user by JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: UserRole;
}

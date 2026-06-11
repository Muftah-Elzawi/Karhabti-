/**
 * Shared contracts (shapes only — business rules live in apps/api).
 *
 * Domain-specific request/response types will be GENERATED into
 * @karhabti/api-client from the API's OpenAPI spec; this package holds only
 * the hand-written cross-cutting primitives.
 */

/** Every API response uses this envelope (KARHABTI_BUILD_PROMPT.md §6). */
export interface ApiEnvelope<TData, TMeta = Record<string, unknown>> {
  data: TData | null;
  meta: TMeta | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/** Cursor-based pagination metadata for list endpoints. */
export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

import type { ApiEnvelope, Locale, PageMeta, UserRole } from '@karhabti/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Hand-written interim shapes — replaced by the GENERATED @karhabti/api-client
 * once client generation is wired to the API's OpenAPI spec.
 */
export interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  locale: Locale;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface BookingDto {
  id: string;
  status: BookingStatus;
  scheduledFor: string;
  priceLYD: string;
  notes: string | null;
  service: { id: string; name: string; durationMinutes: number };
  vehicle: { id: string; label: string };
  address: { id: string; label: string; governorate: string; area: string };
  provider: { id: string; businessName: string } | null;
  review: { rating: number; body: string | null } | null;
  cancellationReason: string | null;
  timeline: {
    createdAt: string;
    confirmedAt: string | null;
    inProgressAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
}

export type ProviderStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface ProviderDto {
  id: string;
  businessName: string;
  governorate: string;
  serviceAreas: string[];
  rating: string | null;
  isVerified: boolean;
  status: ProviderStatus;
  user: { id: string; phone: string; displayName: string };
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  actor: { id: string; displayName: string; phone: string } | null;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(code);
  }
}

async function fetchEnvelope<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('NETWORK', 0);
  }

  if (response.status === 204) return { data: undefined as T, meta: null, error: null };

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !envelope || envelope.error) {
    throw new ApiError(
      envelope?.error?.code ?? 'INTERNAL_ERROR',
      response.status,
      envelope?.error?.details,
    );
  }
  return envelope;
}

/** Server-side call to the Karhabti API; unwraps the { data, meta, error } envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await fetchEnvelope<T>(path, init);
  return envelope.data as T;
}

/** Like apiFetch, but keeps the page meta (cursor pagination). */
export async function apiFetchPage<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta: PageMeta | null }> {
  const envelope = await fetchEnvelope<T>(path, init);
  return { data: envelope.data as T, meta: (envelope.meta as PageMeta | null) ?? null };
}

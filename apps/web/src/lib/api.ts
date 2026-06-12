import type { ApiEnvelope, Locale, UserRole } from '@karhabti/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Hand-written interim shape — replaced by the GENERATED @karhabti/api-client
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

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(code);
  }
}

/** Server-side call to the Karhabti API; unwraps the { data, meta, error } envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

  if (response.status === 204) return undefined as T;

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !envelope || envelope.error) {
    throw new ApiError(
      envelope?.error?.code ?? 'INTERNAL_ERROR',
      response.status,
      envelope?.error?.details,
    );
  }
  return envelope.data as T;
}

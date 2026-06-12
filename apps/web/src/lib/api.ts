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

export interface ServiceCategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export interface ServiceDto {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceLYD: string;
  durationMinutes: number;
}

export interface VehicleMakeDto {
  id: string;
  name: string;
  slug: string;
  models: { id: string; name: string; slug: string }[];
}

export interface VehicleDto {
  id: string;
  make: { id: string; name: string; slug: string };
  model: { id: string; name: string; slug: string };
  year: number;
  nickname: string | null;
  mileageKm: number;
  isDefault: boolean;
}

export interface AddressDto {
  id: string;
  label: string;
  governorate: string;
  city: string;
  area: string;
  details: string | null;
  isDefault: boolean;
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

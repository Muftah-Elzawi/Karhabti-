import type { ApiEnvelope } from '@karhabti/types';

export interface BffFailure {
  code: string;
  details?: unknown;
}

export type BffResult<T> = { ok: true; data: T } | { ok: false; error: BffFailure };

/** Browser-side call to our own BFF route handlers (same origin, cookie auth). */
export async function postJson<T>(path: string, body?: unknown): Promise<BffResult<T>> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return { ok: true, data: undefined as T };

    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok || !envelope || envelope.error) {
      return {
        ok: false,
        error: {
          code: envelope?.error?.code ?? 'INTERNAL_ERROR',
          details: envelope?.error?.details,
        },
      };
    }
    return { ok: true, data: envelope.data as T };
  } catch {
    return { ok: false, error: { code: 'NETWORK' } };
  }
}

import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

import { ApiError } from './api';

export function envelopeJson<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, meta: null, error: null }, { status });
}

export function errorJson(code: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { data: null, meta: null, error: { code, message: code, ...(details ? { details } : {}) } },
    { status },
  );
}

/** Route-handler wrapper for body-less calls: forwards API errors as envelopes. */
export async function forwardingApiErrors(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return errorJson(error.code, error.status > 0 ? error.status : 502, error.details);
    }
    return errorJson('INTERNAL_ERROR', 500);
  }
}

/**
 * Route-handler wrapper: validates the body with the SHARED Zod schema (the
 * same one the API enforces), then forwards API errors as envelopes.
 */
export async function withParsedBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  handler: (input: T) => Promise<NextResponse>,
): Promise<NextResponse> {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(
      'VALIDATION_ERROR',
      422,
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return forwardingApiErrors(() => handler(parsed.data));
}

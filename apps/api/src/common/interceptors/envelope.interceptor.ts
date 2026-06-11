import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { ApiEnvelope } from '@karhabti/types';

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    'error' in value
  );
}

/**
 * Wraps every successful response in the `{ data, meta, error }` envelope
 * (KARHABTI_BUILD_PROMPT.md §6). Handlers that already return an envelope
 * (e.g. list endpoints attaching pagination meta) pass through untouched.
 */
@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<unknown>> {
    return next.handle().pipe(
      map((payload) => {
        if (isApiEnvelope(payload)) return payload;
        return { data: payload ?? null, meta: null, error: null };
      }),
    );
  }
}

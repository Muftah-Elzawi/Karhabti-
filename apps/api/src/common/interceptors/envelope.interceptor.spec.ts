import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { EnvelopeInterceptor } from './envelope.interceptor';

describe('EnvelopeInterceptor', () => {
  const interceptor = new EnvelopeInterceptor();
  const context = {} as ExecutionContext;

  const run = (payload: unknown) =>
    lastValueFrom(interceptor.intercept(context, { handle: () => of(payload) } as CallHandler));

  it('wraps a plain payload in the envelope', async () => {
    await expect(run({ id: 1 })).resolves.toEqual({
      data: { id: 1 },
      meta: null,
      error: null,
    });
  });

  it('turns undefined into data: null', async () => {
    await expect(run(undefined)).resolves.toEqual({ data: null, meta: null, error: null });
  });

  it('passes an existing envelope through untouched', async () => {
    const envelope = { data: [1, 2], meta: { nextCursor: null, hasMore: false }, error: null };
    await expect(run(envelope)).resolves.toBe(envelope);
  });
});

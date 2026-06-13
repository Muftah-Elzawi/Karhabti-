import type { ArgumentsHost } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { z } from 'zod';

import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const logger = { error: jest.fn(), warn: jest.fn() } as unknown as PinoLogger;
  const filter = new AllExceptionsFilter(logger);

  beforeEach(() => jest.clearAllMocks());

  it('maps an HttpException to the error envelope with a stable code', () => {
    const { host, status, json } = createHost();
    filter.catch(new NotFoundException('Booking not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      data: null,
      meta: null,
      error: { code: 'NOT_FOUND', message: 'Booking not found' },
    });
  });

  it('maps a ZodError to 422 VALIDATION_ERROR with issue details', () => {
    const { host, status, json } = createHost();
    const result = z.object({ phone: z.string() }).safeParse({});
    if (result.success) throw new Error('expected parse failure');

    filter.catch(result.error, host);

    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0]?.[0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([
      expect.objectContaining({ path: 'phone', code: 'invalid_type' }),
    ]);
  });

  it('hides internals of unexpected errors and logs at error level', () => {
    const { host, status, json } = createHost();
    filter.catch(new Error('db password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      data: null,
      meta: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(logger.error).toHaveBeenCalled();
  });
});

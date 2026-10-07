import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ZodError } from 'zod';

import type { ApiEnvelope } from '@karhabti/types';

/** Stable, client-facing error codes — clients map these to i18n messages. */
function statusToCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
  };
  return codes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR');
}

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

function normalize(exception: unknown): NormalizedError {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { status, code: statusToCode(status), message: body };
    }
    const record = body as Record<string, unknown>;
    const message = Array.isArray(record['message'])
      ? record['message'].join('; ')
      : typeof record['message'] === 'string'
        ? record['message']
        : exception.message;
    const code = typeof record['code'] === 'string' ? record['code'] : statusToCode(status);
    return { status, code, message, details: record['details'] };
  }

  if (exception instanceof ZodError) {
    return {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      })),
    };
  }

  // Never leak internals of unexpected errors to clients.
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

/**
 * Global catch-all: every error leaves the API as the standard envelope
 * `{ data: null, meta: null, error: { code, message, details? } }`.
 * 5xx errors are logged at error level and reported to Sentry.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, code, message, details } = normalize(exception);

    if (status >= 500) {
      this.logger.error({ err: exception }, message);
      Sentry.captureException(exception);
    } else {
      this.logger.warn({ err: exception, code }, message);
    }

    const envelope: ApiEnvelope<null> = {
      data: null,
      meta: null,
      error: details === undefined ? { code, message } : { code, message, details },
    };
    response.status(status).json(envelope);
  }
}

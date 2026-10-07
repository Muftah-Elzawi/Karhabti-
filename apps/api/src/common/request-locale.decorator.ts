import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type RequestLocaleValue = 'ar' | 'en';

/**
 * Resolves the response language from Accept-Language (§6).
 * Arabic is the default; only an explicit English preference switches.
 */
export const RequestLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestLocaleValue => {
    const request = context.switchToHttp().getRequest<Request>();
    const header = (request.headers['accept-language'] ?? '').toLowerCase().trim();
    return header.startsWith('en') ? 'en' : 'ar';
  },
);

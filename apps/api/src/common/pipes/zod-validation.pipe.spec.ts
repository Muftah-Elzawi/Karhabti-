import { HttpException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ phone: z.string().regex(/^09[1-5]\d{7}$/) });
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed value for valid input', () => {
    expect(pipe.transform({ phone: '0912345678' })).toEqual({ phone: '0912345678' });
  });

  it('throws 422 VALIDATION_ERROR for invalid input', () => {
    try {
      pipe.transform({ phone: 'not-a-phone' });
      throw new Error('expected the pipe to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(422);
      const body = httpError.getResponse() as Record<string, unknown>;
      expect(body['code']).toBe('VALIDATION_ERROR');
    }
  });
});

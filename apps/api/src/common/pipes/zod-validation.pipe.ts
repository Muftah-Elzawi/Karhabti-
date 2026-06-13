import type { PipeTransform } from '@nestjs/common';
import { HttpException, Injectable } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Validates request input against a Zod schema (CLAUDE.md: never skip input
 * validation). Usage on an endpoint:
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingDto) {}
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        },
        422,
      );
    }
    return result.data;
  }
}

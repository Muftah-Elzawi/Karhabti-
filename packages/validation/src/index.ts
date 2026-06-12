import { z } from 'zod';

export * from './auth';
export * from './catalog';
export * from './locations';
export * from './phone';

export const localeSchema = z.enum(['ar', 'en']);

export type FieldErrors = Record<string, string>;

/** First issue per field — message strings are stable i18n keys. */
export function flattenFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

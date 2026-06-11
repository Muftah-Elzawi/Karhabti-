import { z } from 'zod';

/**
 * Environment contract — validated with Zod at bootstrap so a misconfigured
 * deploy fails fast instead of failing on first use.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  // Required from Phase 1, Step 5 (auth module); optional until then.
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  // Comma-separated list of allowed browser origins.
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return result.data;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

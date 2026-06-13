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
  JWT_ACCESS_SECRET: z.string().min(32, 'use a random secret of at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'use a random secret of at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SENTRY_DSN: z.string().optional(),
  // Comma-separated list of allowed browser origins.
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),

  // Payments (Plutu). `sandbox` selects the in-process mock gateway — no real
  // calls, OTP fixed to PLUTU_SANDBOX_OTP. `live` requires the real credentials
  // and the HTTP driver (added when a merchant account is approved).
  PLUTU_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PLUTU_BASE_URL: z.string().default('https://api.plutu.ly/api/v1'),
  PLUTU_API_KEY: z.string().optional(),
  PLUTU_API_SECRET: z.string().optional(),
  PLUTU_ACCESS_TOKEN: z.string().optional(),
  // HMAC secret used to verify the Plutu callback signature.
  PLUTU_WEBHOOK_SECRET: z.string().default('plutu-sandbox-webhook-secret'),
  // Fixed OTP the sandbox gateway accepts (dev/testing only).
  PLUTU_SANDBOX_OTP: z.string().default('123456'),
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

import * as Sentry from '@sentry/node';

// Must be imported before anything else in main.ts (Sentry instruments
// modules at require time). No-op when SENTRY_DSN is not set.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

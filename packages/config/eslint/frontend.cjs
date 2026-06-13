/**
 * ESLint preset for frontend apps and shared UI packages.
 * Adds to the base boundary rules: the database package (Prisma) is consumed
 * by apps/api ONLY — frontends must go through @karhabti/api-client over HTTP.
 */
const boundaries = require('./boundaries.cjs');

const basePatterns = boundaries.rules['no-restricted-imports'][1].patterns;

module.exports = {
  extends: [require.resolve('./base.cjs')],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...basePatterns,
          {
            group: ['@karhabti/database', '@karhabti/database/*', '@prisma/client', '.prisma/*'],
            message:
              'The database layer (Prisma) is consumed by apps/api ONLY. Frontends talk to the API over HTTP via @karhabti/api-client.',
          },
        ],
      },
    ],
  },
};

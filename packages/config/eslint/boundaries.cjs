/**
 * Monorepo boundary rules (KARHABTI_BUILD_PROMPT.md §3a).
 *
 * Dependency direction is one-way only:
 *   apps/*     → packages/*   allowed
 *   packages/* → apps/*       FORBIDDEN — fails lint/CI
 *   apps/*     → apps/*       FORBIDDEN — fails lint/CI
 *
 * Apps are never importable: not by workspace package name, not by relative
 * path reaching into another app's source tree. Clients talk to the API over
 * HTTP via the generated @karhabti/api-client only.
 */
const APP_PACKAGE_NAMES = ['@karhabti/api', '@karhabti/web', '@karhabti/admin', '@karhabti/mobile'];

module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: APP_PACKAGE_NAMES.flatMap((name) => [name, `${name}/*`]),
            message:
              'Apps must never be imported (apps→apps and packages→apps are forbidden). Talk to the API over HTTP via @karhabti/api-client.',
          },
          {
            group: ['**/apps/*', '**/apps/**'],
            message:
              "Never reach into an app's source tree. Shared code belongs in packages/*; clients use @karhabti/api-client over HTTP.",
          },
        ],
      },
    ],
  },
};

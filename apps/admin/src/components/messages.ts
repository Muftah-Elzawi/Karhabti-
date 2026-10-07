import type { Messages } from '@karhabti/i18n';

export type ErrorMessages = Messages['errors'];

/** Maps a stable error code / field-message key to localized copy. */
export function translateError(errorsT: ErrorMessages, code: string): string {
  return (errorsT as Record<string, string>)[code] ?? errorsT.INTERNAL_ERROR;
}

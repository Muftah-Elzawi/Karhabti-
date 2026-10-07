import { cookies } from 'next/headers';

import type { Locale, Messages } from '@karhabti/i18n';
import { defaultLocale, locales, messages } from '@karhabti/i18n';

export const LOCALE_COOKIE = 'karhabti_locale';

/** Server-side locale resolution: cookie, falling back to Arabic. */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value && (locales as readonly string[]).includes(value)
    ? (value as Locale)
    : defaultLocale;
}

export function getMessages(): Messages {
  return messages[getLocale()];
}

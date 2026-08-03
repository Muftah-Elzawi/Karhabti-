import type { Locale } from '@karhabti/i18n';
import { defaultLocale, dirFor, locales } from '@karhabti/i18n';

import { fonts } from '@/theme';

/** Stored-preference resolution: unknown/absent values fall back to Arabic. */
export function resolveLocale(stored: string | null): Locale {
  return stored && (locales as readonly string[]).includes(stored)
    ? (stored as Locale)
    : defaultLocale;
}

export function isRtl(locale: Locale): boolean {
  return dirFor(locale) === 'rtl';
}

/** The brand pairs IBM Plex Sans Arabic (ar) with Inter (en), two weights each. */
export function fontForLocale(locale: Locale, weight: 'regular' | 'medium' = 'regular'): string {
  if (locale === 'ar') return weight === 'medium' ? fonts.arabicMedium : fonts.arabic;
  return weight === 'medium' ? fonts.latinMedium : fonts.latin;
}

import { localeLabels, locales } from '@karhabti/i18n';

import { setLocale } from '@/app/actions';
import { getLocale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const current = getLocale();
  return (
    <form action={setLocale} className="locale-switcher">
      {locales.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          disabled={locale === current}
          className="locale-btn"
        >
          {localeLabels[locale]}
        </button>
      ))}
    </form>
  );
}

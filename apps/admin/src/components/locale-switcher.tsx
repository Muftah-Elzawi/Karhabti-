import { localeLabels, locales } from '@karhabti/i18n';

import { setLocale } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const current = getLocale();
  return (
    <form action={setLocale} className="flex items-center gap-1">
      {locales.map((locale) => (
        <Button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          variant="ghost"
          size="sm"
          disabled={locale === current}
        >
          {localeLabels[locale]}
        </Button>
      ))}
    </form>
  );
}

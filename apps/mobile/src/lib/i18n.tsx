import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DevSettings, I18nManager } from 'react-native';

import type { Locale, Messages } from '@karhabti/i18n';
import { defaultLocale, dirFor, messages } from '@karhabti/i18n';

import { fontForLocale, isRtl, resolveLocale } from '@/lib/locale';
import { appStorage, storageKeys } from '@/lib/storage';

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  messages: Messages;
  setLocale: (locale: Locale) => void;
  /** Font family for the active locale (brand: Plex Arabic / Inter). */
  font: (weight?: 'regular' | 'medium') => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

let directionReloadRequested = false;

/**
 * React Native mirrors layout only when the native I18nManager flag matches,
 * and the flag applies on the next JS load. Production builds already boot RTL
 * (app.json extra.forcesRTL); in dev/Expo Go we flip the flag and reload once.
 */
function syncLayoutDirection(locale: Locale): void {
  const wantRtl = isRtl(locale);
  if (I18nManager.isRTL === wantRtl || directionReloadRequested) return;
  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);
  directionReloadRequested = true;
  // TODO(M5): production locale switching needs expo-updates reloadAsync;
  // until then a release build applies a direction change on the next launch.
  if (__DEV__) DevSettings.reload();
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    let cancelled = false;
    void appStorage.get(storageKeys.locale).then((stored) => {
      if (cancelled) return;
      const resolved = resolveLocale(stored);
      setLocaleState(resolved);
      syncLayoutDirection(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: dirFor(locale),
      messages: messages[locale],
      setLocale: (next: Locale) => {
        setLocaleState(next);
        void appStorage.set(storageKeys.locale, next).catch(() => undefined);
        syncLayoutDirection(next);
      },
      font: (weight = 'regular') => fontForLocale(locale, weight),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LocaleProvider>');
  return ctx;
}

// TODO: review Arabic copy — all ar.json strings are placeholders pending
// review by a native Libyan speaker (the operations partner).
import ar from './locales/ar.json';
import en from './locales/en.json';

export const defaultLocale = 'ar' as const;
export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const messages = { ar, en } as const;
export type Messages = typeof ar;

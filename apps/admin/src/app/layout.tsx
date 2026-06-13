import './globals.css';

import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { dirFor } from '@karhabti/i18n';

import { getLocale, getMessages } from '@/lib/i18n';

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-arabic',
});

const latinFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-latin',
});

export function generateMetadata(): Metadata {
  const t = getMessages();
  return {
    title: { default: t.admin.dashboard, template: `%s — ${t.common.appName}` },
    robots: { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${arabicFont.variable} ${latinFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

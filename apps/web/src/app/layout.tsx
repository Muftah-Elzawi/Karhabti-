import './globals.css';

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { dirFor } from '@karhabti/i18n';

import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { SiteFooter } from '@/components/site-footer';
import { getLocale, getMessages } from '@/lib/i18n';

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500'],
  variable: '--font-arabic',
});

const latinFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-latin',
});

export function generateMetadata(): Metadata {
  const t = getMessages();
  return {
    title: { default: t.common.appName, template: `%s — ${t.common.appName}` },
    description: t.common.tagline,
    applicationName: t.common.appName,
    manifest: '/manifest.webmanifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#3B1E4A',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = getLocale();
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${arabicFont.variable} ${latinFont.variable}`}
    >
      <body>
        <ServiceWorkerRegister />
        <div className="app-shell">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

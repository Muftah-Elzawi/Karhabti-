import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { defaultLocale, messages } from '@karhabti/i18n';

const t = messages[defaultLocale];

export const metadata: Metadata = {
  title: t.common.appName,
  description: t.common.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={defaultLocale} dir="rtl">
      <body>{children}</body>
    </html>
  );
}

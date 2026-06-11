import type { MetadataRoute } from 'next';

import { defaultLocale, messages } from '@karhabti/i18n';

export default function manifest(): MetadataRoute.Manifest {
  const t = messages[defaultLocale];
  return {
    name: t.common.appName,
    short_name: t.common.appName,
    description: t.common.tagline,
    lang: 'ar',
    dir: 'rtl',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF7F2',
    theme_color: '#C8102E',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

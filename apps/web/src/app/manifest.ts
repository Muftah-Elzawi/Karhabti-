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
    background_color: '#F2E8DB',
    theme_color: '#3B1E4A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

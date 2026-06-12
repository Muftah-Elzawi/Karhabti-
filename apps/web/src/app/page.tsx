import Link from 'next/link';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { getMessages } from '@/lib/i18n';
import { getAccessToken } from '@/lib/session';

export default function HomePage() {
  const t = getMessages();
  const isAuthenticated = Boolean(getAccessToken());

  return (
    <main className="page page-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img src="/brand/karhabti-app-icon.svg" alt="" width={96} height={96} className="logo" />
      <h1 className="brand">{t.common.appName}</h1>
      <p className="tagline">{t.common.tagline}</p>

      {isAuthenticated ? (
        <div className="home-nav">
          <Link className="btn btn-primary" href="/services">
            {t.services.title}
          </Link>
          <Link className="btn btn-primary" href="/bookings">
            {t.bookings.title}
          </Link>
          <Link className="btn btn-ghost" href="/profile">
            {t.auth.profileTitle}
          </Link>
        </div>
      ) : (
        <div className="btn-row">
          <Link className="btn btn-primary" href="/register">
            {t.auth.registerTitle}
          </Link>
          <Link className="btn btn-primary" href="/login">
            {t.auth.loginTitle}
          </Link>
        </div>
      )}

      <LocaleSwitcher />
    </main>
  );
}

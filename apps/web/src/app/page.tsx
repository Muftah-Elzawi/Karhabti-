import Link from 'next/link';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { getMessages } from '@/lib/i18n';
import { getAccessToken } from '@/lib/session';

export default function HomePage() {
  const t = getMessages();
  const isAuthenticated = Boolean(getAccessToken());

  return (
    <main className="page page-center">
      <h1 className="brand">{t.common.appName}</h1>
      <p className="tagline">{t.common.tagline}</p>

      {isAuthenticated ? (
        <div className="btn-row">
          <Link className="btn btn-primary" href="/profile">
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

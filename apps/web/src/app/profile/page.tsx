import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/auth/logout-button';
import type { UserProfile } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { getAccessToken } from '@/lib/session';

export function generateMetadata(): Metadata {
  return { title: getMessages().auth.profileTitle };
}

export default async function ProfilePage() {
  const accessToken = getAccessToken();
  if (!accessToken) redirect('/login');

  let user: UserProfile | null = null;
  try {
    user = await apiFetch<UserProfile>('/auth/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  } catch {
    user = null;
  }
  if (!user) redirect('/login');

  const t = getMessages();
  const locale = getLocale();
  const roleLabel = {
    CUSTOMER: t.auth.roleCustomer,
    PROVIDER: t.auth.roleProvider,
    ADMIN: t.auth.roleAdmin,
  }[user.role];
  const memberSince = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'long',
  }).format(new Date(user.createdAt));

  return (
    <main className="page page-center">
      <div className="card">
        <h1 className="title">{t.auth.profileTitle}</h1>

        <dl>
          <div className="profile-row">
            <dt>{t.auth.displayName}</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div className="profile-row">
            <dt>{t.auth.phone}</dt>
            <dd>
              <bdi dir="ltr">{user.phone}</bdi>{' '}
              {user.isPhoneVerified ? (
                <span className="badge-success">{t.auth.phoneVerified}</span>
              ) : null}
            </dd>
          </div>
          {user.email ? (
            <div className="profile-row">
              <dt>{t.auth.email}</dt>
              <dd>
                <bdi dir="ltr">{user.email}</bdi>
              </dd>
            </div>
          ) : null}
          <div className="profile-row">
            <dt>{t.auth.role}</dt>
            <dd>{roleLabel}</dd>
          </div>
          <div className="profile-row">
            <dt>{t.auth.memberSince}</dt>
            <dd>{memberSince}</dd>
          </div>
        </dl>

        <div style={{ marginBlockStart: 'var(--space-lg)' }}>
          <LogoutButton label={t.auth.logout} />
        </div>

        <p className="auth-footer">
          <Link href="/">{t.common.back}</Link>
        </p>
      </div>
    </main>
  );
}

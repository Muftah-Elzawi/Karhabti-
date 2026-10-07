import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';
import { getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().auth.loginTitle };
}

export default function LoginPage() {
  const t = getMessages();
  return (
    <main className="page page-center">
      <div className="card">
        <h1 className="title">{t.auth.loginTitle}</h1>
        <LoginForm t={t.auth} errorsT={t.errors} />
        <p className="auth-footer">
          <Link href="/register">{t.auth.noAccount}</Link>
        </p>
      </div>
    </main>
  );
}

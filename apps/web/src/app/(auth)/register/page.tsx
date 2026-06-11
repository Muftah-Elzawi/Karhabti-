import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/auth/register-form';
import { getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().auth.registerTitle };
}

export default function RegisterPage() {
  const t = getMessages();
  return (
    <main className="page page-center">
      <div className="card">
        <h1 className="title">{t.auth.registerTitle}</h1>
        <RegisterForm t={t.auth} errorsT={t.errors} />
        <p className="auth-footer">
          <Link href="/login">{t.auth.haveAccount}</Link>
        </p>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { libyanPhoneSchema } from '@karhabti/validation';

import { VerifyForm } from '@/components/auth/verify-form';
import { getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().auth.verifyTitle };
}

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { phone?: string; resend?: string };
}) {
  const phone = libyanPhoneSchema.safeParse(searchParams.phone);
  if (!phone.success) redirect('/register');

  const t = getMessages();
  return (
    <main className="page page-center">
      <div className="card">
        <h1 className="title">{t.auth.verifyTitle}</h1>
        <VerifyForm
          t={t.auth}
          errorsT={t.errors}
          phone={phone.data}
          autoResend={searchParams.resend === '1'}
        />
      </div>
    </main>
  );
}

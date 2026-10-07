import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMessages } from '@/lib/i18n';
import { getAccessToken } from '@/lib/session';

export function generateMetadata(): Metadata {
  return { title: getMessages().admin.loginTitle };
}

export default function LoginPage() {
  if (getAccessToken()) redirect('/bookings');

  const t = getMessages();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t.admin.loginTitle}</CardTitle>
          <CardDescription>{t.common.appName}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm t={t} />
        </CardContent>
      </Card>
    </main>
  );
}

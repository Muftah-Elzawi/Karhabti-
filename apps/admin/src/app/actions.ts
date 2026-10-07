'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { locales } from '@karhabti/i18n';

import { LOCALE_COOKIE } from '@/lib/i18n';

export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get('locale');
  if (typeof value === 'string' && (locales as readonly string[]).includes(value)) {
    cookies().set(LOCALE_COOKIE, value, {
      path: '/',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  revalidatePath('/', 'layout');
}

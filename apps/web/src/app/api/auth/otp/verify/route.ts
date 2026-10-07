import { verifyOtpSchema } from '@karhabti/validation';

import type { AuthTokens, UserProfile } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { setSessionCookies } from '@/lib/session';

export async function POST(request: Request) {
  return withParsedBody(request, verifyOtpSchema, async (input) => {
    const { accessToken, refreshToken, user } = await apiFetch<AuthTokens & { user: UserProfile }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify(input) },
    );
    setSessionCookies({ accessToken, refreshToken });
    return envelopeJson({ user });
  });
}

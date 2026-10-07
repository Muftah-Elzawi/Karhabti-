import { loginSchema } from '@karhabti/validation';

import type { AuthTokens, UserProfile } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { setSessionCookies } from '@/lib/session';

export async function POST(request: Request) {
  return withParsedBody(request, loginSchema, async (input) => {
    const { accessToken, refreshToken, user } = await apiFetch<AuthTokens & { user: UserProfile }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
    );
    // Tokens go into httpOnly cookies only — never to client JS.
    setSessionCookies({ accessToken, refreshToken });
    return envelopeJson({ user });
  });
}

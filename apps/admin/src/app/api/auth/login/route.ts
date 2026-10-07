import { loginSchema } from '@karhabti/validation';

import type { AuthTokens, UserProfile } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { envelopeJson, errorJson, withParsedBody } from '@/lib/bff';
import { setSessionCookies } from '@/lib/session';

export async function POST(request: Request) {
  return withParsedBody(request, loginSchema, async (input) => {
    const { accessToken, refreshToken, user } = await apiFetch<AuthTokens & { user: UserProfile }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
    );
    // This dashboard is admin-only — anyone else gets no session at all.
    if (user.role !== 'ADMIN') return errorJson('FORBIDDEN', 403);
    // Tokens go into httpOnly cookies only — never to client JS.
    setSessionCookies({ accessToken, refreshToken });
    return envelopeJson({ user });
  });
}

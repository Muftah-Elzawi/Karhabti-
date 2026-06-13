import { registerSchema } from '@karhabti/validation';

import { apiFetch } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';

export async function POST(request: Request) {
  return withParsedBody(request, registerSchema, async (input) => {
    const data = await apiFetch<{ phone: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return envelopeJson(data, 201);
  });
}

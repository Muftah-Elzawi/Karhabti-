import { createProviderSchema } from '@karhabti/validation';

import type { ProviderDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request) {
  return withParsedBody(request, createProviderSchema, async (input) => {
    const provider = await apiFetchAuthed<ProviderDto>('/admin/providers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return envelopeJson(provider, 201);
  });
}

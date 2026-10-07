import { updateProviderSchema } from '@karhabti/validation';

import type { ProviderDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { apiFetchAuthed } from '@/lib/server-api';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withParsedBody(request, updateProviderSchema, async (input) => {
    const provider = await apiFetchAuthed<ProviderDto>(
      `/admin/providers/${encodeURIComponent(params.id)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
    return envelopeJson(provider);
  });
}

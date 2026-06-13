import { createAddressSchema } from '@karhabti/validation';

import type { AddressDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request) {
  return withParsedBody(request, createAddressSchema, async (input) => {
    const address = await apiFetchAuthed<AddressDto>('/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return envelopeJson(address, 201);
  });
}

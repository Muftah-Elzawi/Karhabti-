import { createVehicleSchema } from '@karhabti/validation';

import type { VehicleDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request) {
  return withParsedBody(request, createVehicleSchema, async (input) => {
    const vehicle = await apiFetchAuthed<VehicleDto>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return envelopeJson(vehicle, 201);
  });
}

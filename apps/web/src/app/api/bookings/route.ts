import { createBookingSchema } from '@karhabti/validation';

import type { BookingDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { getLocale } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request) {
  return withParsedBody(request, createBookingSchema, async (input) => {
    const booking = await apiFetchAuthed<BookingDto>('/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'accept-language': getLocale() },
    });
    return envelopeJson(booking, 201);
  });
}

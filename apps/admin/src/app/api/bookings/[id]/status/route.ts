import { adminBookingStatusSchema } from '@karhabti/validation';

import type { BookingDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { getLocale } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withParsedBody(request, adminBookingStatusSchema, async (input) => {
    const booking = await apiFetchAuthed<BookingDto>(
      `/admin/bookings/${encodeURIComponent(params.id)}/status`,
      {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'accept-language': getLocale() },
      },
    );
    return envelopeJson(booking);
  });
}

import type { BookingDto } from '@/lib/api';
import { envelopeJson, errorJson, forwardingApiErrors } from '@/lib/bff';
import { getLocale } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';

/** The four provider job actions — anything else is not a route. */
const PROVIDER_ACTIONS = new Set(['accept', 'decline', 'start', 'complete']);

export async function POST(
  _request: Request,
  { params }: { params: { id: string; action: string } },
) {
  if (!PROVIDER_ACTIONS.has(params.action)) return errorJson('NOT_FOUND', 404);
  return forwardingApiErrors(async () => {
    const booking = await apiFetchAuthed<BookingDto>(
      `/provider/bookings/${encodeURIComponent(params.id)}/${params.action}`,
      { method: 'POST', headers: { 'accept-language': getLocale() } },
    );
    return envelopeJson(booking);
  });
}

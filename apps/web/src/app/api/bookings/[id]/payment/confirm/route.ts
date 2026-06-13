import { confirmPaymentSchema } from '@karhabti/validation';

import type { PaymentDto } from '@/lib/api';
import { envelopeJson, withParsedBody } from '@/lib/bff';
import { getLocale } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withParsedBody(request, confirmPaymentSchema, async (input) => {
    const payment = await apiFetchAuthed<PaymentDto>(
      `/bookings/${encodeURIComponent(params.id)}/payment/confirm`,
      {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'accept-language': getLocale() },
      },
    );
    return envelopeJson(payment);
  });
}

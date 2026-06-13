import type { PaymentDto } from '@/lib/api';
import { envelopeJson, forwardingApiErrors } from '@/lib/bff';
import { apiFetchAuthed } from '@/lib/server-api';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return forwardingApiErrors(async () => {
    const payment = await apiFetchAuthed<PaymentDto>(
      `/admin/payments/${encodeURIComponent(params.id)}/refund`,
      { method: 'POST' },
    );
    return envelopeJson(payment);
  });
}

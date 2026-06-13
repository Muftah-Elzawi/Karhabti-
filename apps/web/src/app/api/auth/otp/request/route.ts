import { NextResponse } from 'next/server';

import { requestOtpSchema } from '@karhabti/validation';

import { apiFetch } from '@/lib/api';
import { withParsedBody } from '@/lib/bff';

export async function POST(request: Request) {
  return withParsedBody(request, requestOtpSchema, async (input) => {
    await apiFetch<void>('/auth/otp/request', { method: 'POST', body: JSON.stringify(input) });
    return new NextResponse(null, { status: 204 });
  });
}

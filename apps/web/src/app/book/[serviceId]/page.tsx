import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import type { AddressDto, ServiceDto, VehicleDto, VehicleMakeDto } from '@/lib/api';
import { ApiError, apiFetch } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';
import { getAccessToken } from '@/lib/session';
import { BookingWizard } from '@/components/booking/booking-wizard';

export function generateMetadata(): Metadata {
  return { title: getMessages().booking.title };
}

export default async function BookServicePage({ params }: { params: { serviceId: string } }) {
  if (!getAccessToken()) redirect('/login');

  const locale = getLocale();
  const headers = { 'accept-language': locale };

  let service: ServiceDto;
  try {
    service = await apiFetch<ServiceDto>(`/services/${encodeURIComponent(params.serviceId)}`, {
      headers,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  let vehicles: VehicleDto[];
  let addresses: AddressDto[];
  let makes: VehicleMakeDto[];
  try {
    [vehicles, addresses, makes] = await Promise.all([
      apiFetchAuthed<VehicleDto[]>('/vehicles'),
      apiFetchAuthed<AddressDto[]>('/addresses'),
      apiFetch<VehicleMakeDto[]>('/vehicle-makes'),
    ]);
  } catch {
    redirect('/login');
  }

  const t = getMessages();
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{t.booking.title}</h1>
      </div>
      <BookingWizard
        service={service}
        vehicles={vehicles}
        addresses={addresses}
        makes={makes}
        t={t}
      />
    </main>
  );
}

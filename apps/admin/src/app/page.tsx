import { redirect } from 'next/navigation';

/** The dashboard home is the bookings queue. */
export default function AdminHomePage() {
  redirect('/bookings');
}

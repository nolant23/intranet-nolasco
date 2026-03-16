"use client";

import { useRouter } from "next/navigation";
import { BookingForm } from "../../components/BookingForm";

export function BookingModificaClient({ booking }: { booking: any }) {
  const router = useRouter();

  const handleSuccess = (id: string) => {
    router.push(`/booking/${id}`);
  };

  return <BookingForm bookingId={booking.id} defaultValues={booking} onSuccess={handleSuccess} />;
}

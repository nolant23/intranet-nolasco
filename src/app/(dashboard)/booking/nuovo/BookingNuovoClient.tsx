"use client";

import { useRouter } from "next/navigation";
import { BookingForm } from "../components/BookingForm";

export function BookingNuovoClient() {
  const router = useRouter();

  const handleSuccess = (id: string) => {
    router.push(`/booking/${id}`);
  };

  return <BookingForm onSuccess={handleSuccess} />;
}

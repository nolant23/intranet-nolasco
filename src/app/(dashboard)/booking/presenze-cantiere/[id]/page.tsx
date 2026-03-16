import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { getPresenzaCantiereById } from "@/app/(dashboard)/tecnici/presenze-cantiere/actions";
import { PresenzaCantiereDetailClient } from "@/app/(dashboard)/tecnici/presenze-cantiere/PresenzaCantiereDetailClient";

export default async function BookingPresenzaCantiereDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.READ && !permissions?.PresenzeCantiere?.READ) redirect("/booking");

  const { id } = await params;
  const presenza = await getPresenzaCantiereById(id);
  if (!presenza) notFound();

  return (
    <PresenzaCantiereDetailClient
      presenza={presenza}
      backHref="/booking/presenze-cantiere"
      showBookingLink={true}
    />
  );
}

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { getPresenzaCantiereById } from "../actions";
import { PresenzaCantiereDetailClient } from "../PresenzaCantiereDetailClient";

export default async function PresenzaCantiereDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  const canAccess =
    permissions?.Tecnici?.READ || permissions?.Booking?.READ || permissions?.PresenzeCantiere?.READ;
  if (!canAccess) redirect("/");

  const { id } = await params;
  const presenza = await getPresenzaCantiereById(id);
  if (!presenza) notFound();

  return (
    <PresenzaCantiereDetailClient
      presenza={presenza}
      backHref="/tecnici/presenze-cantiere"
      showBookingLink={false}
    />
  );
}

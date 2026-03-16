import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getBookingById } from "../actions";
import { BookingDetailClient } from "./BookingDetailClient";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.READ) redirect("/");

  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) redirect("/booking/commesse");

  const modulePerms = permissions?.Booking;
  return <BookingDetailClient booking={booking} permissions={modulePerms} />;
}

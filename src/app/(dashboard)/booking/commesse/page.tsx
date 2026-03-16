import { getBookings } from "../actions";
import { BookingClient } from "../components/BookingClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function BookingCommessePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Booking;
  if (!modulePerms?.READ) redirect("/booking");

  const bookings = await getBookings();

  return <BookingClient bookings={bookings} permissions={modulePerms} />;
}

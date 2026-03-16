import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getBookingById } from "../../actions";
import { buttonVariants } from "@/lib/button-variants";
import { ArrowLeft } from "lucide-react";
import { BookingForm } from "../../components/BookingForm";
import { BookingModificaClient } from "./BookingModificaClient";

export default async function BookingModificaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.UPDATE) redirect("/booking/commesse");

  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) redirect("/booking/commesse");

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <Link href={`/booking/${id}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Modifica booking</h1>
            <p className="text-slate-500 font-medium mt-1">{booking.codiceImpianto}</p>
          </div>
        </div>
      </div>
      <BookingModificaClient booking={booking} />
    </div>
  );
}

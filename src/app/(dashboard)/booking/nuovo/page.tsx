import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { buttonVariants } from "@/lib/button-variants";
import { ArrowLeft } from "lucide-react";
import { BookingForm } from "../components/BookingForm";
import { BookingNuovoClient } from "./BookingNuovoClient";

export default async function BookingNuovoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.CREATE) redirect("/booking");

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/booking/commesse" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Nuovo Impianto</h1>
            <p className="text-slate-500 font-medium mt-1">Inserisci i dati del booking</p>
          </div>
        </div>
      </div>
      <BookingNuovoClient />
    </div>
  );
}

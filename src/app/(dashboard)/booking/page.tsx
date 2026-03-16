import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, HardHat } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

export default async function BookingDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Booking?.READ) redirect("/");

  const bookingCount = await prisma.booking.count();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Booking
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Vendite nuovi impianti e commesse
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Activity className="h-6 w-6" strokeWidth={2.5} />
          <span>Booking</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/booking/commesse" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-teal-600 via-teal-500 to-teal-400 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <ClipboardList className="w-32 h-32 text-white" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                Commesse
              </CardTitle>
              <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                <ClipboardList className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-5xl font-black text-white tracking-tighter">
                {bookingCount}
              </div>
              <p className="text-base text-teal-50 font-bold mt-2 uppercase tracking-wider">
                Vendite nuovi impianti
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/booking/presenze-cantiere" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-400 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <HardHat className="w-32 h-32 text-white" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                Presenze cantiere
              </CardTitle>
              <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                <HardHat className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-amber-50 font-bold mt-2 uppercase tracking-wider">
                Elenco e importa CSV
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

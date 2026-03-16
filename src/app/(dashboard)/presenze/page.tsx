import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, HardHat } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function PresenzeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Per i tecnici la dashboard presenze è sempre su /tecnici/presenze
  if (user.role === "TECNICO") redirect("/tecnici/presenze");

  const permissions = await getPermissionsForRole(user.role);
  const canPresenze = permissions?.Presenze?.READ;
  const canPresenzeCantiere = permissions?.Tecnici?.READ || permissions?.Booking?.READ || permissions?.PresenzeCantiere?.READ;
  if (!canPresenze && !canPresenzeCantiere) redirect("/");

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Presenze
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Ore, registri e presenze cantiere
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {canPresenze && (
          <Link href="/tecnici/presenze/elenco-presenze" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-teal-600 via-teal-500 to-teal-400 text-white overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Presenze
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <CalendarDays className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-teal-50 font-bold uppercase tracking-wider">
                  Ore e registri presenze
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {canPresenzeCantiere && (
          <Link href="/tecnici/presenze/presenze-cantiere" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-400 text-white overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Presenze cantiere
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <HardHat className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-amber-50 font-bold uppercase tracking-wider">
                  Elenco e nuova presenza
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}

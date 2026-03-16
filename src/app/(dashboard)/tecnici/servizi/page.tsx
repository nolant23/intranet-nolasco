import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Hammer, ClipboardCheck, LayoutGrid, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { tecnicoCanSeeServizi } from "@/lib/navigation";

export default async function ServiziHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!tecnicoCanSeeServizi(permissions)) redirect("/tecnici");

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Servizi
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Interventi, manutenzioni, verifiche biennali e giro
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <LayoutGrid className="h-6 w-6" strokeWidth={2.5} />
          <span>Servizi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {permissions?.Manutenzioni?.READ && (
          <Link href="/tecnici/servizi/manutenzioni" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 text-white overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Manutenzioni
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <Wrench className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-sky-50 font-bold uppercase tracking-wider">
                  Registra e consulta
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.Interventi?.READ && (
          <Link href="/tecnici/servizi/interventi" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 text-white overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Interventi
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <Hammer className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-emerald-50 font-bold uppercase tracking-wider">
                  Registra e consulta
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.VerificheBiennali?.READ && (
          <Link href="/tecnici/servizi/verifiche-biennali" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-violet-600 via-violet-500 to-violet-400 text-white overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Verifiche biennali
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <ClipboardCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-violet-50 font-bold uppercase tracking-wider">
                  Elenco verifiche periodiche
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.Manutenzioni?.READ && (
          <Link href="/tecnici/servizi/giro" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-amber-500 via-amber-400 to-amber-300 text-slate-900 overflow-hidden relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900/90">
                  Giro
                </CardTitle>
                <div className="p-4 bg-white/40 rounded-2xl group-hover:bg-white/60 transition-colors duration-300">
                  <CalendarDays className="h-8 w-8 text-amber-700" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-base text-amber-900 font-bold uppercase tracking-wider">
                  Manutenzioni da fare
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}

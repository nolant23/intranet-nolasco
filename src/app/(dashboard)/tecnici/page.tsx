import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Activity } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TecniciDashboardCards } from "./components/TecniciDashboardCards";

export default async function TecniciDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Tecnici?.READ) redirect("/");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthName = monthStart.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  // Dashboard dedicata ai tecnici (solo ruolo TECNICO)
  if (user.role === "TECNICO") {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
              Dashboard Tecnico
            </h1>
            <p className="text-slate-500 text-lg font-medium mt-2">
              Azioni rapide
            </p>
          </div>
          <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
            <Activity className="h-6 w-6" strokeWidth={2.5} />
            <span>Tecnici</span>
          </div>
        </div>

        <TecniciDashboardCards permissions={permissions} />
      </div>
    );
  }

  // Dashboard per Admin/Ufficio (rimane quella attuale)
  const tecniciAttivi = await prisma.user.count({
    where: { role: "TECNICO", attivo: true },
  });

  const presenzeMese = await prisma.presenza.findMany({
    where: { data: { gte: monthStart, lte: monthEnd } },
    select: {
      oreOrdinario: true,
      oreStraordinario: true,
      oreFerie: true,
      orePermesso: true,
      oreMalattia: true,
      oreFestivo: true,
    },
  });

  const totaleOrdinario = presenzeMese.reduce((s, p) => s + (p.oreOrdinario ?? 0), 0);
  const totaleStraordinario = presenzeMese.reduce((s, p) => s + (p.oreStraordinario ?? 0), 0);
  const totaleFerie = presenzeMese.reduce((s, p) => s + (p.oreFerie ?? 0), 0);
  const totalePermesso = presenzeMese.reduce((s, p) => s + (p.orePermesso ?? 0), 0);
  const totaleMalattia = presenzeMese.reduce((s, p) => s + (p.oreMalattia ?? 0), 0);
  const totaleFestivo = presenzeMese.reduce((s, p) => s + (p.oreFestivo ?? 0), 0);
  const totaleOre = totaleOrdinario + totaleStraordinario + totaleFerie + totalePermesso + totaleMalattia + totaleFestivo;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Tecnici
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Tecnici attivi e presenze
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Activity className="h-6 w-6" strokeWidth={2.5} />
          <span>Tecnici</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Tecnici attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {tecniciAttivi}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              In organico
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Ore totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {totaleOre.toFixed(1)}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              {monthName}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Ordinario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">
              {totaleOrdinario.toFixed(1)} h
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Straordinario / Ferie / Altro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">
              {totaleStraordinario.toFixed(1)} / {totaleFerie.toFixed(1)} / {(totalePermesso + totaleMalattia + totaleFestivo).toFixed(1)} h
            </div>
          </CardContent>
        </Card>
      </div>

      {permissions?.Presenze?.READ && (
        <Link href="/presenze" className="block group">
          <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] group-hover:-translate-y-1 bg-white overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                Presenze
              </CardTitle>
              <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <CalendarDays className="h-8 w-8 text-slate-700 group-hover:text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-slate-500 font-bold uppercase tracking-wider">
                Ore e registri presenze
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}

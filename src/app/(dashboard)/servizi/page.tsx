import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, ServerCog, FileText, Wrench, Hammer, Activity } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatEuro } from "@/lib/money";

export default async function ServiziDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Servizi?.READ) redirect("/");

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [clientiCount, amministratoriCount, contrattiAttivi, impiantiConContrattoAttivoCount, manutenzioniCount, interventiCount] =
    await Promise.all([
      prisma.cliente.count(),
      prisma.amministratore.count(),
      prisma.contratto.count({ where: { statoContratto: { in: ["Attivo", "ATTIVO"] } } }),
      prisma.impianto.count({
        where: {
          contratti: {
            some: { statoContratto: { in: ["Attivo", "ATTIVO"] } },
          },
        },
      }),
      prisma.manutenzione.count({ where: { dataManutenzione: { gte: yearStart } } }),
      prisma.intervento.count({
        where: { dataIntervento: { gte: yearStart } },
      }),
    ]);

  const serviziAttivi = await prisma.servizioContratto.findMany({
    where: {
      contratto: { statoContratto: { in: ["Attivo", "ATTIVO"] } },
    },
    select: { importo: true },
  });

  const sommaCanoniAttivi = serviziAttivi.reduce(
    (tot, s) => tot + (s.importo ?? 0),
    0
  );
  const canoneMedioAttivi =
    contrattiAttivi > 0 ? sommaCanoniAttivi / contrattiAttivi : 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Servizi
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Anagrafiche, contratti e attività
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Activity className="h-6 w-6" strokeWidth={2.5} />
          <span>Servizi</span>
        </div>
      </div>

      {/* Card principali: Clienti, Amministratori, Impianti, Contratti */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {permissions?.Clienti?.READ && (
          <Link href="/clienti" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-32 h-32 text-white" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Clienti
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <Users className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-black text-white tracking-tighter">
                  {clientiCount}
                </div>
                <p className="text-base text-sky-50 font-bold mt-2 uppercase tracking-wider">
                  Anagrafiche
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.Amministratori?.READ && (
          <Link href="/amministratori" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="w-32 h-32 text-white" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Amministratori
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <Building2 className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                  {amministratoriCount}
                </div>
                <p className="text-base text-indigo-50 font-bold mt-2 uppercase tracking-wider">
                  Studi gestiti
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.Impianti?.READ && (
          <Link href="/impianti" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <ServerCog className="w-32 h-32 text-white" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                  Impianti
                </CardTitle>
                <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                  <ServerCog className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                  {impiantiConContrattoAttivoCount}
                </div>
                <p className="text-base text-emerald-50 font-bold mt-2 uppercase tracking-wider line-clamp-1">
                  Impianti con contratto attivo
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
        {permissions?.Contratti?.READ && (
          <Link href="/contratti" className="block group">
            <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-amber-500 via-amber-400 to-amber-300 text-slate-900 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText className="w-32 h-32 text-amber-900" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xl font-black uppercase tracking-wider text-amber-900/90">
                  Contratti
                </CardTitle>
                <div className="p-4 bg-white/40 rounded-2xl group-hover:bg-white/60 transition-colors duration-300">
                  <FileText className="h-8 w-8 text-amber-900" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                  {contrattiAttivi}
                </div>
                <p className="text-base text-slate-500 font-bold mt-2 uppercase tracking-wider">
                  Contratti attivi
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Card statistiche riepilogo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Manutenzioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {manutenzioniCount}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              Anno in corso
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Interventi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {interventiCount}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              Anno in corso
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Canone medio contratti attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 tracking-tighter">
              {formatEuro(canoneMedioAttivi)}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              Su {contrattiAttivi} contratti attivi
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

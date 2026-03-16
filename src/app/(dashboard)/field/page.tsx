import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Hammer, CalendarDays, Activity, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getImpiantiDaManutenere } from "../manutenzioni/actions";
import { unstable_cache } from "next/cache";

const FieldComunePieChartsClient = dynamic(
  () => import("./components/FieldComunePieChartsClient").then((m) => m.FieldComunePieChartsClient),
  { loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> }
);
const FieldTopImpiantiInterventi = dynamic(
  () => import("./components/FieldTopImpiantiInterventi").then((m) => m.FieldTopImpiantiInterventi),
  { loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> }
);

export default async function FieldDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Field?.READ) redirect("/");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const getCached = unstable_cache(
    async () => {
      const [impiantiDaManutenere, interventiUltimoMese, interventiAnnoGrouped, interventiTotaleGrouped] =
        await Promise.all([
          getImpiantiDaManutenere(),
          prisma.intervento.count({
            where: { dataIntervento: { gte: monthStart } },
          }),
          prisma.intervento.groupBy({
            by: ["impiantoId"],
            where: { dataIntervento: { gte: yearStart } },
            _count: { _all: true },
          }),
          prisma.intervento.groupBy({
            by: ["impiantoId"],
            _count: { _all: true },
          }),
        ]);

      return {
        impiantiDaManutenere,
        interventiUltimoMese,
        interventiAnnoGrouped,
        interventiTotaleGrouped,
      };
    },
    [`field-dashboard-${now.getFullYear()}-${now.getMonth() + 1}`],
    { revalidate: 60, tags: ["field-dashboard"] }
  );

  const {
    impiantiDaManutenere,
    interventiUltimoMese,
    interventiAnnoGrouped,
    interventiTotaleGrouped,
  } = await getCached();

  function buildTopFromGroups(
    groups: { impiantoId: string | null; _count: { _all: number } }[]
  ) {
    return groups
      .filter((g) => g.impiantoId)
      .map((g) => ({ impiantoId: g.impiantoId as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  const gruppiAnno = buildTopFromGroups(interventiAnnoGrouped);
  const gruppiTotale = buildTopFromGroups(interventiTotaleGrouped);

  const impiantoIds = Array.from(
    new Set([
      ...gruppiAnno.map((g) => g.impiantoId),
      ...gruppiTotale.map((g) => g.impiantoId),
    ])
  );

  let topAnno: {
    impiantoId: string;
    numeroImpianto: string;
    cliente: string;
    indirizzo: string;
    comune: string;
    count: number;
  }[] = [];
  let topTotale: typeof topAnno = [];

  if (impiantoIds.length > 0) {
    const impianti = await prisma.impianto.findMany({
      where: { id: { in: impiantoIds } },
      include: { cliente: true },
    });
    const byId = new Map(impianti.map((i) => [i.id, i]));

    const mapGroup = (groupList: { impiantoId: string; count: number }[]) =>
      groupList
        .map((g) => {
          const imp = byId.get(g.impiantoId);
          return {
            impiantoId: g.impiantoId,
            numeroImpianto: imp?.numeroImpianto || "-",
            cliente: imp?.cliente?.denominazione || "",
            indirizzo: imp?.indirizzo || "",
            comune: imp?.comune || "",
            count: g.count,
          };
        })
        .filter((r) => r.impiantoId);

    topAnno = mapGroup(gruppiAnno);
    topTotale = mapGroup(gruppiTotale);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Field
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Manutenzioni da effettuare e interventi
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Activity className="h-6 w-6" strokeWidth={2.5} />
          <span>Field</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {permissions?.Manutenzioni?.READ && (
          <Link href="/manutenzioni" className="block group">
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
          <Link href="/interventi" className="block group">
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
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Impianti da manutenere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {impiantiDaManutenere.length}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              In attesa di visita
            </p>
          </CardContent>
        </Card>
        {permissions?.VerificheBiennali?.READ && (
          <Link href="/verifiche-biennali" className="block group">
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
          <Link href="/giro" className="block group">
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
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-400">
              Interventi ultimo mese
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {interventiUltimoMese}
            </div>
            <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-wider">
              Eseguiti
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="mb-4">
          <div className="text-lg font-black uppercase tracking-wider text-slate-900">
            Rimanenti per Comune
          </div>
          <div className="text-sm text-slate-500 font-medium mt-1">
            Distribuzione degli impianti ancora da manutenere
          </div>
        </div>
        <FieldComunePieChartsClient impiantiDaManutenere={impiantiDaManutenere} />
      </div>

      <FieldTopImpiantiInterventi
        topYear={topAnno}
        topAll={topTotale}
      />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FatturazioneNavCard } from "./FatturazioneNavCard";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatEuro } from "@/lib/money";
import { FatturazioneCharts } from "./FatturazioneCharts";
import { unstable_cache } from "next/cache";

export default async function FatturazioneDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Fatturazione?.READ) redirect("/");

  const now = new Date();
  const year = now.getFullYear();
  // Dashboard fatturazione: usa aggregazioni DB (molto più veloce di findMany su tutte le fatture)
  const getCached = unstable_cache(
    async () => {
      // Totali per anno
      const perAnnoRaw = (await prisma.$queryRaw<
        { year: number; total: number }[]
      >`select extract(year from "data")::int as year, coalesce(sum("importoTotale"),0)::float as total
         from "Fattura"
         group by 1
         order by 1 asc`) as { year: number; total: number }[];

      // Totali per mese nell'anno corrente
      const perMeseRaw = (await prisma.$queryRaw<
        { month: number; total: number }[]
      >`select extract(month from "data")::int as month, coalesce(sum("importoTotale"),0)::float as total
         from "Fattura"
         where extract(year from "data")::int = ${year}
         group by 1
         order by 1 asc`) as { month: number; total: number }[];

      // Serializzabile per unstable_cache: niente Map, solo array/oggetti plain
      const fatturatoPerAnno: [number, number][] = perAnnoRaw.map((r) => [
        Number(r.year),
        Number(r.total),
      ]);

      const fatturatoPerMese: number[] = Array.from({ length: 12 }, () => 0);
      for (const r of perMeseRaw) {
        const idx = Number(r.month) - 1; // 1-12 -> 0-11
        if (idx >= 0 && idx < 12) fatturatoPerMese[idx] = Number(r.total);
      }

      const fatturatoAnnuale =
        perAnnoRaw.find((r) => Number(r.year) === year)?.total ?? 0;

      return { fatturatoPerAnno, fatturatoPerMese, fatturatoAnnuale };
    },
    [`fatturazione-dashboard-${year}-${now.getMonth() + 1}`],
    { revalidate: 60 }
  );

  const { fatturatoPerAnno, fatturatoPerMese, fatturatoAnnuale } = await getCached();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Dashboard Fatturazione
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Andamento fatturato mensile e annuale
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-3">
          <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
            <TrendingUp className="h-6 w-6" strokeWidth={2.5} />
            <span>Fatturazione</span>
          </div>
        </div>
      </div>

      {/* Card principali: Fatture e Note di Credito - stesso comportamento delle altre dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {permissions?.Fatture?.READ && (
          <FatturazioneNavCard
            href="/fatture"
            title="Fatture"
            description="Elenco e sincronizzazione FiC"
            gradient="bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400"
          />
        )}
        {permissions?.Fatture?.READ && (
          <FatturazioneNavCard
            href="/fatture/note-credito"
            title="Note di Credito"
            description="Elenco note di credito emesse"
            gradient="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400"
          />
        )}
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900">
            Fatturato anno {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black text-primary tracking-tighter">
            {formatEuro(fatturatoAnnuale)}
          </div>
        </CardContent>
      </Card>

      <FatturazioneCharts
        fatturatoPerMese={fatturatoPerMese}
        fatturatoPerAnno={[...fatturatoPerAnno].sort((a, b) => a[0] - b[0])}
        currentYear={year}
      />
    </div>
  );
}

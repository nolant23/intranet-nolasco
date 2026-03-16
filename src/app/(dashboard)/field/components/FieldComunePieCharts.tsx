"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type Categoria = "Trimestrali" | "Quadrimestrali" | "Semestrali";
type PieSlice = { label: string; value: number; color: string };

function hashStringToHue(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

function colorForComune(comune: string) {
  const hue = hashStringToHue((comune || "").toLowerCase());
  return `hsl(${hue} 70% 45%)`;
}

function pieFromCounts(counts: Map<string, number>, maxSlices = 8): PieSlice[] {
  const entries = Array.from(counts.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => {
      const diff = b[1] - a[1];
      if (diff !== 0) return diff;
      const la = a[0].toLowerCase();
      const lb = b[0].toLowerCase();
      if (la < lb) return -1;
      if (la > lb) return 1;
      return 0;
    });
  if (entries.length === 0) return [];

  const top = entries.slice(0, maxSlices);
  const rest = entries.slice(maxSlices);
  const slices: PieSlice[] = top.map(([label, value]) => ({
    label,
    value,
    color: colorForComune(label),
  }));
  const others = rest.reduce((s, [, v]) => s + v, 0);
  if (others > 0) slices.push({ label: "Altri", value: others, color: "hsl(0 0% 75%)" });
  return slices;
}

const doughnutOptionsBase: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "55%",
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
          const pct = total > 0 ? ((Number(ctx.raw) / total) * 100).toFixed(1) : "0";
          return `${ctx.label}: ${ctx.raw} (${pct}%)`;
        },
      },
    },
  },
};

function PieChartWithChartJS({ title, slices }: { title: string; slices: PieSlice[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  const chartData = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => s.color),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    }),
    [slices]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-black uppercase tracking-wider text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 font-medium mt-1">{total} impianti rimanenti</div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 flex items-center justify-center w-[180px] h-[180px] mx-auto sm:mx-0">
          {total === 0 ? (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-2xl font-black text-slate-400">0</span>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Doughnut
                data={chartData}
                options={doughnutOptionsBase}
                aria-label={title}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900">{total}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 gap-2">
            {slices.slice(0, 10).map((sl) => (
              <div key={sl.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: sl.color }}
                  />
                  <span className="text-sm font-semibold text-slate-800 truncate">{sl.label}</span>
                </div>
                <span className="text-sm font-black text-slate-900 tabular-nums">{sl.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldComunePieCharts({ impiantiDaManutenere }: { impiantiDaManutenere: any[] }) {
  const grouped = useMemo(() => {
    const trimestrali: any[] = [];
    const quadrimestrali: any[] = [];
    const semestrali: any[] = [];

    for (const imp of impiantiDaManutenere) {
      const contrattoAttivo = (imp.contratti || []).find(
        (c: any) => c.statoContratto === "Attivo" || c.statoContratto === "ATTIVO"
      );
      const visite = contrattoAttivo?.numeroVisiteAnnue || 0;
      if (visite >= 4) trimestrali.push(imp);
      else if (visite === 3) quadrimestrali.push(imp);
      else if (visite === 2) semestrali.push(imp);
    }
    return { trimestrali, quadrimestrali, semestrali };
  }, [impiantiDaManutenere]);

  const pieData = useMemo(() => {
    const counts = (list: any[]) => {
      const m = new Map<string, number>();
      for (const imp of list) {
        const comune = (imp?.comune || "Senza comune").trim() || "Senza comune";
        m.set(comune, (m.get(comune) ?? 0) + 1);
      }
      return pieFromCounts(m, 8);
    };
    return {
      Trimestrali: counts(grouped.trimestrali),
      Quadrimestrali: counts(grouped.quadrimestrali),
      Semestrali: counts(grouped.semestrali),
    } satisfies Record<Categoria, PieSlice[]>;
  }, [grouped]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PieChartWithChartJS title="Rimanenti Trimestrali" slices={pieData.Trimestrali} />
      <PieChartWithChartJS title="Rimanenti Quadrimestrali" slices={pieData.Quadrimestrali} />
      <PieChartWithChartJS title="Rimanenti Semestrali" slices={pieData.Semestrali} />
    </div>
  );
}

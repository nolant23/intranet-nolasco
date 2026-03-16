"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/money";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

/** Palette di colori per le barre (una per barra). */
const BAR_COLORS = [
  { bg: "rgba(14, 165, 233, 0.75)", border: "rgb(14, 165, 233)" },   // sky
  { bg: "rgba(34, 197, 94, 0.75)", border: "rgb(34, 197, 94)" },       // green
  { bg: "rgba(168, 85, 247, 0.75)", border: "rgb(168, 85, 247)" },     // violet
  { bg: "rgba(234, 179, 8, 0.75)", border: "rgb(234, 179, 8)" },       // amber
  { bg: "rgba(239, 68, 68, 0.75)", border: "rgb(239, 68, 68)" },       // red
  { bg: "rgba(20, 184, 166, 0.75)", border: "rgb(20, 184, 166)" },     // teal
  { bg: "rgba(249, 115, 22, 0.75)", border: "rgb(249, 115, 22)" },     // orange
  { bg: "rgba(99, 102, 241, 0.75)", border: "rgb(99, 102, 241)" },     // indigo
  { bg: "rgba(236, 72, 153, 0.75)", border: "rgb(236, 72, 153)" },     // pink
  { bg: "rgba(22, 163, 74, 0.75)", border: "rgb(22, 163, 74)" },       // emerald
  { bg: "rgba(59, 130, 246, 0.75)", border: "rgb(59, 130, 246)" },     // blue
  { bg: "rgba(131, 24, 67, 0.75)", border: "rgb(131, 24, 67)" },       // rose-900
];
const colorAt = (i: number) => BAR_COLORS[i % BAR_COLORS.length];

const chartOptionsBase: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => (ctx.raw != null ? formatEuro(Number(ctx.raw)) : ""),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: "bold" }, color: "#64748b" },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0,0,0,0.06)" },
      ticks: { font: { size: 10 }, color: "#94a3b8", callback: (v) => (typeof v === "number" ? formatEuro(v) : v) },
    },
  },
};

type Props = {
  fatturatoPerMese: number[];
  fatturatoPerAnno: [number, number][];
  currentYear: number;
};

export function FatturazioneCharts({ fatturatoPerMese, fatturatoPerAnno, currentYear }: Props) {
  const maxMese = Math.max(...fatturatoPerMese, 0);
  const maxAnno = Math.max(...fatturatoPerAnno.map(([, v]) => v), 0);

  const chartMensile = {
    labels: MESI,
    datasets: [
      {
        label: "Fatturato",
        data: fatturatoPerMese,
        backgroundColor: MESI.map((_, i) => colorAt(i).bg),
        borderColor: MESI.map((_, i) => colorAt(i).border),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartAnnuale = {
    labels: fatturatoPerAnno.map(([anno]) => String(anno)),
    datasets: [
      {
        label: "Fatturato",
        data: fatturatoPerAnno.map(([, val]) => val),
        backgroundColor: fatturatoPerAnno.map((_, i) => colorAt(i).bg),
        borderColor: fatturatoPerAnno.map((_, i) => colorAt(i).border),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900">
            Fatturato mensile {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <Bar data={chartMensile} options={chartOptionsBase} />
          </div>
          {maxMese > 0 && (
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Max: {formatEuro(maxMese)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900">
            Fatturato annuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <Bar data={chartAnnuale} options={chartOptionsBase} />
          </div>
          {maxAnno > 0 && (
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Max: {formatEuro(maxAnno)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

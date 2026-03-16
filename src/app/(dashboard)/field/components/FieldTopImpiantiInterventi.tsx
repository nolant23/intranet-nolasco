"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TopRow = {
  impiantoId: string;
  numeroImpianto: string;
  cliente: string;
  indirizzo: string;
  comune: string;
  count: number;
};

export function FieldTopImpiantiInterventi({
  topYear,
  topAll,
}: {
  topYear: TopRow[];
  topAll: TopRow[];
}) {
  const [tab, setTab] = useState<"year" | "all">("year");

  const rows = tab === "year" ? topYear : topAll;

  return (
    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-900">
            Impianti con più interventi
          </CardTitle>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 uppercase tracking-wide">
            Top 10 per numero di interventi eseguiti
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs sm:text-sm font-semibold uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setTab("year")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors",
              tab === "year"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            )}
          >
            Anno in corso
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors",
              tab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            )}
          >
            Totale
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {rows.length === 0 ? (
          <div className="py-6 text-sm text-slate-500 font-medium text-center">
            Nessun dato disponibile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] sm:text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 text-left">N° Impianto</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Indirizzo</th>
                  <th className="px-3 py-2 text-left">Comune</th>
                  <th className="px-3 py-2 text-right">Interventi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.impiantoId}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-semibold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                      {row.numeroImpianto || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-slate-700 whitespace-normal break-words">
                      {row.cliente || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-slate-700 whitespace-normal break-words">
                      {row.indirizzo || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-slate-700 whitespace-normal break-words">
                      {row.comune || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-right font-bold text-slate-900 whitespace-nowrap">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


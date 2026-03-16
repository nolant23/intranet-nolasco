"use client";

import { useMemo, useState } from "react";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";

type GiroClientProps = {
  impiantiDaManutenere: any[];
  permissions: any;
};

type Categoria = "Trimestrali" | "Quadrimestrali" | "Semestrali";

export function GiroClient({ impiantiDaManutenere }: GiroClientProps) {
  const [tab, setTab] = useState<Categoria>("Trimestrali");

  const grouped = useMemo(() => {
    const trimestrali: any[] = [];
    const quadrimestrali: any[] = [];
    const semestrali: any[] = [];

    for (const imp of impiantiDaManutenere) {
      const contrattoAttivo = (imp.contratti || []).find(
        (c: any) =>
          c.statoContratto === "Attivo" ||
          c.statoContratto === "ATTIVO"
      );
      const visite = contrattoAttivo?.numeroVisiteAnnue || 0;
      if (visite >= 4) {
        trimestrali.push(imp);
      } else if (visite === 3) {
        quadrimestrali.push(imp);
      } else if (visite === 2) {
        semestrali.push(imp);
      }
    }

    return { trimestrali, quadrimestrali, semestrali };
  }, [impiantiDaManutenere]);

  const currentData =
    tab === "Trimestrali"
      ? grouped.trimestrali
      : tab === "Quadrimestrali"
      ? grouped.quadrimestrali
      : grouped.semestrali;

  const sortedData = useMemo(() => {
    const getUltima = (imp: any) => {
      const d = imp?.manutenzioni?.[0]?.dataManutenzione;
      return d ? new Date(d).getTime() : 0; // senza manutenzioni -> in cima
    };
    return [...currentData].sort((a, b) => getUltima(a) - getUltima(b));
  }, [currentData]);

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Giro Manutenzioni
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Elenco impianti da manutenere per frequenza
          </p>
        </div>
      </div>

      <div className="grid-table-card">
        <div className="flex gap-2 p-4 border-b border-slate-200 overflow-x-auto">
          {(["Trimestrali", "Quadrimestrali", "Semestrali"] as Categoria[]).map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTab(c)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide ${
                  tab === c
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            )
          )}
        </div>

        <div className="overflow-x-auto pr-2 md:pr-4">
          {currentData.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-10">Nessun impianto da manutenere in questa categoria.</div>
          ) : (
            <>
            <div className="md:hidden space-y-3">
              {sortedData.map((imp: any) => {
                const ultimaSem = imp.manutenzioni?.find((m: any) => m.effettuaSemestrale);
                return (
                  <div key={imp.id} className="grid-table-mobile-card">
                    <p className="font-bold text-slate-900">{imp.numeroImpianto || "-"}</p>
                    <p className="text-sm text-slate-700">{imp.indirizzo}</p>
                    <p className="text-sm text-slate-600">{(imp.cap || "-")} {imp.comune} ({imp.provincia || "-"})</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">{imp.cliente?.denominazione || "-"}</p>
                    <p className="text-xs text-slate-500 mt-1">Ult. manut. {imp.manutenzioni?.length > 0 ? new Date(imp.manutenzioni[0].dataManutenzione).toLocaleDateString("it-IT") : "-"} · Ult. sem. {ultimaSem ? new Date(ultimaSem.dataManutenzione).toLocaleDateString("it-IT") : "-"}</p>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
            <VirtualizedTable
              items={sortedData}
              rowHeight={48}
              gridTemplateColumns="1.2fr 1.8fr 1.2fr 1.5fr 1.2fr 0.8fr"
              maxHeight="60vh"
              header={
                <>
                  <TableTh>N° Impianto</TableTh>
                  <TableTh>Indirizzo</TableTh>
                  <TableTh>Comune</TableTh>
                  <TableTh>Cliente</TableTh>
                  <TableTh>Ult. manut.</TableTh>
                  <TableTh>Ult. semest.</TableTh>
                </>
              }
            >
              {(imp: any) => {
                const ultimaSem = imp.manutenzioni?.find((m: any) => m.effettuaSemestrale);
                const comuneLine = `${imp.cap || "-"} ${imp.comune} (${imp.provincia || "-"})`.trim();
                return (
                  <>
                    <TableTd className="nowrap font-semibold">{imp.numeroImpianto || "-"}</TableTd>
                    <TableTd className="truncate" title={imp.indirizzo}>{imp.indirizzo}</TableTd>
                    <TableTd className="truncate text-slate-600" title={comuneLine}>{comuneLine}</TableTd>
                    <TableTd className="truncate" title={imp.cliente?.denominazione ?? ""}>{imp.cliente?.denominazione || "-"}</TableTd>
                    <TableTd className="nowrap">{imp.manutenzioni?.length > 0 ? new Date(imp.manutenzioni[0].dataManutenzione).toLocaleDateString("it-IT") : "-"}</TableTd>
                    <TableTd className="nowrap">{ultimaSem ? new Date(ultimaSem.dataManutenzione).toLocaleDateString("it-IT") : "-"}</TableTd>
                  </>
                );
              }}
            </VirtualizedTable>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


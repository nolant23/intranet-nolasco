"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEuro } from "@/lib/money";
import { TableSearch } from "@/components/table/TableSearch";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";

export function NoteCreditoArchivioClient({
  initialNoteCredito,
  permissions,
}: {
  initialNoteCredito: any[];
  permissions: any;
}) {
  const [noteCredito] = useState<any[]>(initialNoteCredito);
  const [search, setSearch] = useState("");
  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set(noteCredito.map((n) => new Date(n.data).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [noteCredito]);

  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) setSelectedYear(String(availableYears[0]));
  }, [availableYears.length, selectedYear]);

  const displayYear = selectedYear && availableYears.includes(parseInt(selectedYear, 10)) ? selectedYear : (availableYears[0]?.toString() ?? "");

  const baseNote = useMemo(() => {
    if (!displayYear) return noteCredito;
    return noteCredito.filter((n) => new Date(n.data).getFullYear().toString() === displayYear);
  }, [noteCredito, displayYear]);

  const filteredNote = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseNote;
    return baseNote.filter((n: any) =>
      [n.numero, n.clienteNome, n.oggetto, n.fattura?.numero]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [baseNote, search]);

  const formatCurrency = (value: number) => formatEuro(value);
  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString("it-IT");

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Archivio Note di credito
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Note di credito degli anni passati (escluso {currentYear})
          </p>
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-4">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Cerca nota, cliente, fattura..."
          />
          {availableYears.length > 0 && (
            <Select value={displayYear} onValueChange={(v) => v && setSelectedYear(v)}>
              <SelectTrigger className="w-full min-w-0 sm:w-[110px] bg-white" id="view-year-nc-arch">
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {filteredNote.length === 0 ? (
          <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">
            Nessuna nota di credito in archivio per i filtri selezionati.
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 px-2">
              {filteredNote.map((f) => (
                <Link key={f.id} href={`/fatture/note-credito/${f.id}`} className="grid-table-mobile-card cursor-pointer block">
                  <p className="text-xs text-slate-500">{formatDate(f.data)}</p>
                  <p className="font-bold text-purple-600">{f.numero}</p>
                  <p className="text-sm font-medium text-slate-800">{f.clienteNome}</p>
                  <p className="text-sm text-purple-600 font-semibold">{formatCurrency(f.importoTotale)}</p>
                  <p className="text-xs text-slate-600">{f.fattura ? `Fatt. n° ${f.fattura.numero}` : "—"}</p>
                  {f.urlDocumento && (
                    <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs text-purple-600" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(f.urlDocumento, "_blank"); }}>
                      <FileText className="w-3 h-3 mr-1" /> PDF
                    </Button>
                  )}
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <VirtualizedTable
                items={filteredNote}
                rowHeight={48}
                gridTemplateColumns="0.9fr 0.7fr 2fr 0.9fr 1fr 2.2fr 0.8fr"
                maxHeight="60vh"
                header={
                  <>
                    <TableTh>Data</TableTh>
                    <TableTh>Numero</TableTh>
                    <TableTh>Cliente</TableTh>
                    <TableTh>Importo</TableTh>
                    <TableTh>Fattura</TableTh>
                    <TableTh>Oggetto</TableTh>
                    <TableTh>Azioni</TableTh>
                  </>
                }
              >
                {(f) => (
                  <>
                    <TableTd className="nowrap">{formatDate(f.data)}</TableTd>
                    <TableTd>
                      <Link href={`/fatture/note-credito/${f.id}`} className="text-purple-600 hover:underline font-semibold text-sm">{f.numero}</Link>
                    </TableTd>
                    <TableTd className="truncate font-medium" title={f.clienteNome}>{f.clienteNome}</TableTd>
                    <TableTd className="font-semibold text-purple-600">{formatCurrency(f.importoTotale)}</TableTd>
                    <TableTd className="truncate">{f.fattura ? `Fatt. n° ${f.fattura.numero}` : "—"}</TableTd>
                    <TableTd className="truncate text-slate-600 text-xs" title={f.oggetto || ""}>{f.oggetto || "-"}</TableTd>
                    <TableTd className="center">
                      {f.urlDocumento ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-purple-600" onClick={() => window.open(f.urlDocumento, "_blank")}>
                          <FileText className="w-3 h-3 mr-0.5" /> PDF
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableTd>
                  </>
                )}
              </VirtualizedTable>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

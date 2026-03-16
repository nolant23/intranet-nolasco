"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, FileText, Undo2, CalendarDays, Briefcase, Info, EuroIcon } from "lucide-react";
import Link from "next/link";
import { fetchNoteCreditoInCloudList, processaBatchNoteCredito } from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useSearchParams, useRouter } from "next/navigation";
import { formatEuro } from "@/lib/money";
import { TableSearch } from "@/components/table/TableSearch";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";

export function NoteCreditoClient({ 
  initialNoteCredito,
  permissions 
}: { 
  initialNoteCredito: any[];
  permissions: any;
}) {
  const [noteCredito, setNoteCredito] = useState<any[]>(initialNoteCredito);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const currentYear = new Date().getFullYear();
  const [syncYear, setSyncYear] = useState<string>(currentYear.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const canCreate = permissions?.CREATE;

  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const ncId = searchParams.get("nc");
    if (ncId) router.replace(`/fatture/note-credito/${ncId}`);
  }, [searchParams, router]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    
    try {
      const resList = await fetchNoteCreditoInCloudList(parseInt(syncYear));
      if (!resList.success || !resList.documents) {
        alert(resList.error || "Errore nel recupero della lista note di credito");
        setIsSyncing(false);
        setSyncProgress(null);
        return;
      }
      
      const totalDocs = resList.documents.length;
      if (totalDocs === 0) {
        alert("Nessuna nota di credito da sincronizzare per quest'anno.");
        setIsSyncing(false);
        setSyncProgress(null);
        return;
      }

      setSyncProgress({ current: 0, total: totalDocs });
      
      let processed = 0;
      const batchSize = 10;
      
      for (let i = 0; i < totalDocs; i += batchSize) {
        const batch = resList.documents.slice(i, i + batchSize);
        const resBatch = await processaBatchNoteCredito(batch);
        
        if (!resBatch.success) {
          console.error("Errore batch:", resBatch.error);
        }
        
        processed += batch.length;
        setSyncProgress({ current: Math.min(processed, totalDocs), total: totalDocs });
      }
      
      alert(`Sincronizzazione completata: ${totalDocs} note di credito elaborate.`);
      window.location.reload();
    } catch (e) {
      alert("Errore imprevisto durante la sincronizzazione");
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const formatCurrency = (value: number) => formatEuro(value);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT');
  };

  const availableYears = useMemo(() => {
    const years = new Set(noteCredito.map((n) => new Date(n.data).getFullYear().toString()));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [noteCredito]);

  const baseNote = useMemo(() => {
    return noteCredito.filter(
      (n) => new Date(n.data).getFullYear().toString() === selectedYear
    );
  }, [noteCredito, selectedYear]);

  const filteredNote = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseNote;
    return baseNote.filter((n: any) =>
      [
        n.numero,
        n.clienteNome,
        n.oggetto,
        n.fattura?.numero,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [baseNote, search]);

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Note di Credito
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Elenco note di credito per anno selezionato
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto items-stretch sm:items-center min-w-0">
          {canCreate && (
            <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0 sm:w-auto items-stretch sm:items-center rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 shadow-sm">
              <Select value={syncYear} onValueChange={(val) => val && setSyncYear(val)}>
                <SelectTrigger className="w-full sm:w-[100px] bg-white min-w-0" id="sync-year-nc">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: currentYear - 2020 + 1}, (_, i) => currentYear - i).map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSync} disabled={isSyncing} className="w-full sm:w-auto min-w-0 uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-md text-sm sm:text-base">
                <RefreshCcw className={`mr-2 h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} /> 
                <span className="truncate">{isSyncing 
                  ? `Sincronizzo... ${syncProgress && syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) + '%' : ''}`
                  : 'Sincronizza Note'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-4">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Cerca nota, cliente, fattura..."
          />
          <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
            <SelectTrigger className="w-full min-w-0 sm:w-[110px] bg-white" id="view-year-nc">
              <SelectValue placeholder="Anno" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0
                ? availableYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))
                : (
                  <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                )}
            </SelectContent>
          </Select>
        </div>
        {filteredNote.length === 0 ? (
          <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">Nessuna nota di credito trovata. Clicca su &quot;Sincronizza Note&quot; per scaricare i dati.</div>
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
                {f.urlDocumento && <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs text-purple-600" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(f.urlDocumento, "_blank"); }}><FileText className="w-3 h-3 mr-1" /> PDF</Button>}
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
                <TableTd><Link href={`/fatture/note-credito/${f.id}`} className="text-purple-600 hover:underline font-semibold text-sm">{f.numero}</Link></TableTd>
                <TableTd className="truncate font-medium" title={f.clienteNome}>{f.clienteNome}</TableTd>
                <TableTd className="font-semibold text-purple-600">{formatCurrency(f.importoTotale)}</TableTd>
                <TableTd className="truncate">{f.fattura ? `Fatt. n° ${f.fattura.numero}` : "—"}</TableTd>
                <TableTd className="truncate text-slate-600 text-xs" title={f.oggetto || ""}>{f.oggetto || "-"}</TableTd>
                <TableTd className="center">{f.urlDocumento ? <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-purple-600" onClick={() => window.open(f.urlDocumento, "_blank")}><FileText className="w-3 h-3 mr-0.5" /> PDF</Button> : <span className="text-xs text-slate-400">-</span>}</TableTd>
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

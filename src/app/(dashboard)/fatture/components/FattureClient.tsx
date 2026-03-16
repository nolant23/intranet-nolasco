"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, FileText, FileMinus } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFattureInCloudList, processaBatchFatture, getFatturePaginated, getFattureArchivioPaginated } from "../actions";
import { formatEuro } from "@/lib/money";
import { TableSearch } from "@/components/table/TableSearch";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";

export function FattureClient({
  initialFatture,
  initialTotal = 0,
  pageSize = 25,
  currentYear: propCurrentYear,
  permissions,
  isArchive = false,
  modalOnly = false,
  archiveYears = [],
}: {
  initialFatture: any[];
  initialTotal?: number;
  pageSize?: number;
  currentYear?: number;
  permissions: any;
  isArchive?: boolean;
  modalOnly?: boolean;
  archiveYears?: number[];
}) {
  const currentYear = propCurrentYear ?? new Date().getFullYear();
  const [fatture, setFatture] = useState<any[]>(initialFatture);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [archiveSelectedYear, setArchiveSelectedYear] = useState<string>("tutti");
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);
  const isInitialArchiveFetch = useRef(true);
  const [isSyncing, setIsSyncing] = useState(false);
 const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

 const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
 const [syncYear, setSyncYear] = useState<string>(currentYear.toString());

 const searchParams = useSearchParams();
 const router = useRouter();
 const backToNotaCreditoId = searchParams.get("fromNc");
 const [search, setSearch] = useState("");

 useEffect(() => {
   const f = searchParams.get("f");
   if (f) router.replace(`/fatture/${f}`);
 }, [searchParams, router]);

  // Archivio: anni per il dropdown (Tutti + anni disponibili)
  const availableYears = useMemo(() => {
    if (!isArchive) return [];
    return ["tutti", ...archiveYears.map((y) => String(y))];
  }, [isArchive, archiveYears]);

  // Archivio: fetch quando cambiano pagina o anno (salto primo mount)
  useEffect(() => {
    if (!isArchive) return;
    if (isInitialArchiveFetch.current) {
      isInitialArchiveFetch.current = false;
      return;
    }
    let cancelled = false;
    setIsLoadingPage(true);
    const year = archiveSelectedYear === "tutti" ? null : parseInt(archiveSelectedYear, 10);
    getFattureArchivioPaginated(year, page, pageSize).then(({ data, total }) => {
      if (!cancelled) {
        setFatture(data);
        setTotalCount(total);
        setIsLoadingPage(false);
      }
    });
    return () => { cancelled = true; };
  }, [isArchive, page, archiveSelectedYear, pageSize, archiveRefreshKey]);

  // Dati da mostrare: in archivio è la pagina corrente, altrimenti fatture (lista principale)
  const baseFatture = fatture;

 const displayFatture = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return baseFatture;
   return baseFatture.filter((f: any) =>
     [
       f.numero,
       f.clienteNome,
       f.oggetto,
       f.stato,
     ]
       .filter(Boolean)
       .some((field) => String(field).toLowerCase().includes(q))
   );
 }, [baseFatture, search]);

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    
    try {
      const resList = await fetchFattureInCloudList(parseInt(syncYear));
      if (!resList.success || !resList.documents) {
        alert(resList.error || "Errore nel recupero della lista fatture");
        setIsSyncing(false);
        setSyncProgress(null);
        return;
      }
      
      const totalDocs = resList.documents.length;
      if (totalDocs === 0) {
        alert("Nessuna fattura da sincronizzare.");
        setIsSyncing(false);
        setSyncProgress(null);
        return;
      }

      setSyncProgress({ current: 0, total: totalDocs });
      
      let processed = 0;
      const batchSize = 10;
      
      for (let i = 0; i < totalDocs; i += batchSize) {
        const batch = resList.documents.slice(i, i + batchSize);
        const resBatch = await processaBatchFatture(batch);
        
        if (!resBatch.success) {
          console.error("Errore batch:", resBatch.error);
        }
        
        processed += batch.length;
        setSyncProgress({ current: Math.min(processed, totalDocs), total: totalDocs });
      }
      
      alert(`Sincronizzazione completata: ${totalDocs} fatture elaborate.`);
      window.location.reload(); // Reload to get fresh data from DB
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

 return (
<div className="flex flex-col gap-6 w-full p-2">
  {!modalOnly && (
    <>
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
       <div>
         <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
           {isArchive ? "Archivio Fatture" : "Fatture"}
         </h1>
         <p className="text-slate-500 font-medium mt-1">
           {isArchive ? "Storico di tutte le fatture sincronizzate" : "Elenco fatture dell'anno in corso"}
         </p>
       </div>
       
       <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto items-stretch sm:items-center min-w-0">
        {isArchive ? (
          <>
            {availableYears.length > 0 && (
              <Select
                value={archiveSelectedYear}
                onValueChange={(val) => {
                  if (val) {
                    setArchiveSelectedYear(val);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full min-w-0 sm:w-[140px] bg-white"
                  id="fatture-year-select"
                >
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year === "tutti" ? "Tutti" : year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              onClick={() => setArchiveRefreshKey((k) => k + 1)}
              disabled={isLoadingPage}
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 shrink-0 ${isLoadingPage ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
           </>
         ) : (
           <>
             <Link href="/fatture/note-credito" className="w-full sm:w-auto">
               <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-300">
                 <FileMinus className="mr-2 h-4 w-4" /> Note Credito
               </Button>
             </Link>
             {canCreate && (
               <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0 sm:w-auto items-stretch sm:items-center rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 shadow-sm">
                 <Select value={syncYear} onValueChange={(val) => val && setSyncYear(val)}>
                   <SelectTrigger className="w-full sm:w-[100px] bg-white min-w-0" id="sync-year-select">
                     <SelectValue placeholder="Anno" />
                   </SelectTrigger>
                   <SelectContent>
                     {Array.from({length: currentYear - 2020 + 1}, (_, i) => currentYear - i).map(y => (
                       <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <Button onClick={handleSync} disabled={isSyncing} className="w-full sm:w-auto min-w-0 uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-md text-sm sm:text-base">
                   <RefreshCcw className={`mr-2 h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} /> 
                   <span className="truncate">{isSyncing 
                     ? `Sincronizzo... ${syncProgress && syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) + '%' : ''}`
                     : 'Sincronizza con FiC'}</span>
                 </Button>
               </div>
             )}
           </>
         )}
       </div>
     </div>

     <div className="grid-table-card overflow-hidden">
<div className="flex justify-start px-4 pt-4 pb-4">
  <TableSearch
    value={search}
    onChange={setSearch}
    placeholder="Cerca numero, cliente, oggetto..."
  />
</div>
{displayFatture.length === 0 && !isLoadingPage ? (
          <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">Nessuna fattura trovata.{!isArchive && " Clicca su \"Sincronizza con FiC\" per scaricare i dati."}</div>
        ) : isLoadingPage && displayFatture.length === 0 ? (
          <div className="text-center text-slate-500 font-medium py-12">Caricamento...</div>
        ) : (
          <>
          <div className="md:hidden space-y-3 px-2">
            {displayFatture.map((f) => (
              <a key={f.id} href={isArchive ? `/fatture/${f.id}?from=archivio` : `/fatture/${f.id}`} className="grid-table-mobile-card cursor-pointer block">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{formatDate(f.data)}</p>
                    <p className="font-bold text-blue-600">{f.numero}</p>
                    <p className="text-sm font-medium text-slate-800 truncate" title={f.clienteNome}>{f.clienteNome}</p>
                    <p className="text-sm text-slate-600 mt-1">{formatCurrency(f.importoTotale)}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate" title={f.oggetto || ""}>{f.oggetto || "-"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {f.stato === "SALDATO" ? <span className="grid-table__badge grid-table__badge--success">Saldato</span> : f.stato === "STORNATO" ? <span className="grid-table__badge grid-table__badge--muted">Stornato</span> : f.stato === "PARZ. STORNATO" ? <span className="grid-table__badge grid-table__badge--muted">Parz. stornato</span> : f.stato === "PARZIALE" ? <span className="grid-table__badge grid-table__badge--warning">Parziale</span> : <span className="grid-table__badge grid-table__badge--danger">Da saldare</span>}
                    {f.urlDocumento && <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(f.urlDocumento, "_blank"); }}><FileText className="w-3 h-3 mr-1" /> PDF</Button>}
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="hidden md:block">
          <VirtualizedTable
            items={displayFatture}
            rowHeight={48}
            gridTemplateColumns="0.9fr 0.7fr 2fr 0.9fr 1fr 2.2fr 0.8fr"
            maxHeight="60vh"
            header={
              <>
                <TableTh>Data</TableTh>
                <TableTh>Numero</TableTh>
                <TableTh>Cliente</TableTh>
                <TableTh>Importo</TableTh>
                <TableTh>Stato</TableTh>
                <TableTh>Oggetto</TableTh>
                <TableTh>Azioni</TableTh>
              </>
            }
          >
            {(f) => (
              <>
                <TableTd className="nowrap">{formatDate(f.data)}</TableTd>
                <TableTd>
                  <a href={isArchive ? `/fatture/${f.id}?from=archivio` : `/fatture/${f.id}`} className="text-blue-600 hover:underline font-semibold text-sm">{f.numero}</a>
                </TableTd>
                <TableTd className="truncate font-medium" title={f.clienteNome}>{f.clienteNome}</TableTd>
                <TableTd className="font-semibold">{formatCurrency(f.importoTotale)}</TableTd>
                <TableTd className="center">
                  {f.stato === "STORNATO" ? <span className="grid-table__badge grid-table__badge--muted">Stornato</span> : f.stato === "PARZ. STORNATO" ? <span className="grid-table__badge grid-table__badge--muted">Parz.</span> : f.stato === "SALDATO" ? <span className="grid-table__badge grid-table__badge--success">Saldato</span> : f.stato === "PARZIALE" ? <span className="grid-table__badge grid-table__badge--warning">Parz.</span> : <span className="grid-table__badge grid-table__badge--danger">Da saldare</span>}
                </TableTd>
                <TableTd className="truncate text-slate-600 text-xs" title={f.oggetto || ""}>{f.oggetto || "-"}</TableTd>
                <TableTd className="center">
                  {f.urlDocumento ? <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(f.urlDocumento, "_blank")}><FileText className="w-3 h-3 mr-0.5" /> PDF</Button> : <span className="text-xs text-slate-400">-</span>}
                </TableTd>
              </>
            )}
          </VirtualizedTable>
          </div>
          </>
        )}
     {!modalOnly && (isArchive || (typeof initialTotal === "number" && !isArchive)) && (
       <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
         <span className="text-xs sm:text-sm text-slate-600">
           Pagina <span className="font-semibold">{page}</span> di{" "}
           <span className="font-semibold">{Math.max(1, Math.ceil(totalCount / pageSize))}</span> — {totalCount} fatture
         </span>
         <div className="flex gap-2">
           <Button
             type="button"
             variant="outline"
             size="sm"
             disabled={page <= 1 || isLoadingPage}
             onClick={async () => {
               if (page <= 1) return;
               setIsLoadingPage(true);
               try {
                 if (isArchive) {
                   const year = archiveSelectedYear === "tutti" ? null : parseInt(archiveSelectedYear, 10);
                   const { data, total } = await getFattureArchivioPaginated(year, page - 1, pageSize);
                   setFatture(data);
                   setTotalCount(total);
                 } else {
                   const { data, total } = await getFatturePaginated(currentYear, page - 1, pageSize);
                   setFatture(data);
                   setTotalCount(total);
                 }
                 setPage((p) => p - 1);
               } finally {
                 setIsLoadingPage(false);
               }
             }}
           >
             Precedente
           </Button>
           <Button
             type="button"
             variant="outline"
             size="sm"
             disabled={page >= Math.ceil(totalCount / pageSize) || isLoadingPage}
             onClick={async () => {
               const next = page + 1;
               if (next > Math.ceil(totalCount / pageSize)) return;
               setIsLoadingPage(true);
               try {
                 if (isArchive) {
                   const year = archiveSelectedYear === "tutti" ? null : parseInt(archiveSelectedYear, 10);
                   const { data, total } = await getFattureArchivioPaginated(year, next, pageSize);
                   setFatture(data);
                   setTotalCount(total);
                 } else {
                   const { data, total } = await getFatturePaginated(currentYear, next, pageSize);
                   setFatture(data);
                   setTotalCount(total);
                 }
                 setPage(next);
               } finally {
                 setIsLoadingPage(false);
               }
             }}
           >
             Successiva
           </Button>
         </div>
       </div>
     )}
     </div>
    </>
  )}

 </div>
 );
}

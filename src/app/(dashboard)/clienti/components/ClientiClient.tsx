"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, RefreshCcw, FileDigit, CalendarDays, Euro, XCircle, CheckCircle2, Clock } from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { ClienteForm } from "./ClienteForm";
import { deleteCliente, fetchClientiInCloudList, processaBatchClientiFiC, getClientiPaginated } from "../actions";
import Link from "next/link";
import { TableSearch } from "@/components/table/TableSearch";
import {
  DataGrid,
  DataGridScroll,
  DataGridHead,
  DataGridBody,
  DataGridEmpty,
  GridRow,
  GridCell,
  ColumnHeader,
  Badge,
} from "@/components/datagrid";

const CLIENTI_GRID_COLUMNS = "2.4fr 1.2fr 1.2fr 1.6fr 100px";

export function ClientiClient({
  initialClienti,
  initialTotal,
  pageSize,
  permissions,
}: {
  initialClienti: any[];
  initialTotal: number;
  pageSize: number;
  permissions: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clienti, setClienti] = useState<any[]>(initialClienti);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const isInitialFetch = useRef(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

 useEffect(() => {
 if (searchParams.get("new") === "true" && canCreate) {
 setEditingCliente(null);
 setIsOpen(true);
 router.replace(pathname);
 }
}, [searchParams, canCreate, pathname, router]);

useEffect(() => {
  const c = searchParams.get("c");
  if (c) router.replace(`/clienti/${c}`);
}, [searchParams, router]);

 const handleEdit = (cliente: any) => {
 // Nullify empty strings to match optional fields
 const safeCliente = { ...cliente };
 Object.keys(safeCliente).forEach((key) => {
 if (safeCliente[key] === null) safeCliente[key] = "";
 });
 setEditingCliente(safeCliente);
 setIsOpen(true);
 };

 const handleAddNew = () => {
 setEditingCliente(null);
 setIsOpen(true);
 };

 const handleSyncFiC = async () => {
   setIsSyncing(true);
   setSyncProgress({ current: 0, total: 0 });
   try {
     const resList = await fetchClientiInCloudList();
     if (!resList.success || !resList.clients) {
       alert(resList.error || "Errore nel recupero clienti da FiC");
       return;
     }
     const total = resList.clients.length;
     if (total === 0) {
       alert("Nessun cliente trovato su Fatture in Cloud.");
       return;
     }
     setSyncProgress({ current: 0, total });
     const batchSize = 20;
     let processed = 0;
     for (let i = 0; i < total; i += batchSize) {
       const batch = resList.clients.slice(i, i + batchSize);
       const resBatch = await processaBatchClientiFiC(batch);
       if (!resBatch.success) {
         console.error(resBatch.error);
       }
       processed += batch.length;
       setSyncProgress({ current: Math.min(processed, total), total });
     }
     alert(`Sincronizzazione completata: ${total} clienti elaborati.`);
     window.location.reload();
   } finally {
     setIsSyncing(false);
     setSyncProgress(null);
   }
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questo cliente?")) {
 await deleteCliente(id);
 }
 };

const handleOpenDetail = (clienteId: string) => {
   router.push(`/clienti/${clienteId}`);
 };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (isInitialFetch.current) {
      isInitialFetch.current = false;
      return;
    }
    let cancelled = false;
    setIsLoadingPage(true);
    getClientiPaginated(page, pageSize, search.trim() || null).then(({ data, total }) => {
      if (!cancelled) {
        setClienti(data);
        setTotalCount(total);
        setIsLoadingPage(false);
      }
    });
    return () => { cancelled = true; };
  }, [page, search, pageSize]);

  return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Clienti</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione anagrafiche e contatti</p>
 </div>
 <div className="flex flex-wrap gap-3 w-full sm:w-auto">
 {canCreate && (
 <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Plus className="mr-2 h-5 w-5" /> NUOVO CLIENTE
 </Button>
 )}
 {canCreate && (
 <Button onClick={handleSyncFiC} disabled={isSyncing} size="lg" className="w-full sm:w-auto uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-md">
 <RefreshCcw className={`mr-2 h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} /> 
 {isSyncing ? `Sincronizzo... ${syncProgress && syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) + '%' : ''}` : 'Sincronizza con FiC'}
 </Button>
 )}
 </div>
 </div>

<DataGrid className="overflow-hidden">
  <div className="flex justify-start px-4 pt-4 pb-4">
    <TableSearch
      value={searchInput}
      onChange={setSearchInput}
      placeholder="Cerca cliente, comune, email..."
    />
  </div>
  <div className="overflow-x-auto pr-2 md:pr-4">
    {clienti.length === 0 && !isLoadingPage ? (
      <DataGridEmpty>Nessun cliente trovato.</DataGridEmpty>
    ) : isLoadingPage ? (
      <div className="datagrid__empty">Caricamento...</div>
    ) : (
      <>
        <div className="md:hidden space-y-3 px-4 pb-4">
          {clienti.map((cliente) => (
            <div key={cliente.id} onClick={() => handleOpenDetail(cliente.id)} className="datagrid-mobile-card cursor-pointer">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{cliente.denominazione}</p>
                  <p className="mt-0.5"><Badge>{cliente.tipologia}</Badge></p>
                  <p className="text-sm text-slate-600 mt-1">{cliente.comune}{cliente.provincia ? ` (${cliente.provincia})` : ""}</p>
                  <p className="text-sm text-slate-500 truncate">{cliente.cellulare || cliente.email || "-"}</p>
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canUpdate && <Button variant="outline" size="icon" onClick={() => handleEdit(cliente)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
                  {canDelete && <Button variant="outline" size="icon" onClick={() => handleDelete(cliente.id)} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <DataGridScroll maxHeight="60vh">
            <DataGridHead style={{ gridTemplateColumns: CLIENTI_GRID_COLUMNS }}>
              <ColumnHeader>Denominazione</ColumnHeader>
              <ColumnHeader>Tipologia</ColumnHeader>
              <ColumnHeader>Comune</ColumnHeader>
              <ColumnHeader>Contatti</ColumnHeader>
              <ColumnHeader>Azioni</ColumnHeader>
            </DataGridHead>
            <DataGridBody>
              {clienti.map((cliente) => (
                <GridRow
                  key={cliente.id}
                  clickable
                  style={{ gridTemplateColumns: CLIENTI_GRID_COLUMNS }}
                  onClick={() => handleOpenDetail(cliente.id)}
                >
                  <GridCell truncate>{cliente.denominazione}</GridCell>
                  <GridCell><Badge>{cliente.tipologia}</Badge></GridCell>
                  <GridCell truncate>{cliente.comune}{cliente.provincia ? ` (${cliente.provincia})` : ""}</GridCell>
                  <GridCell truncate>{cliente.cellulare || cliente.email || "-"}</GridCell>
                  <GridCell align="actions" onClick={(e) => e.stopPropagation()}>
                    {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(cliente.id)} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                  </GridCell>
                </GridRow>
              ))}
            </DataGridBody>
          </DataGridScroll>
        </div>
      </>
    )}
   </div>
  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
   <span className="text-xs sm:text-sm text-slate-600">
     Pagina <span className="font-semibold">{page}</span> di{" "}
     <span className="font-semibold">{totalPages}</span> — {totalCount} clienti
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
           const { data, total } = await getClientiPaginated(page - 1, pageSize, search.trim() || null);
           setClienti(data);
           setTotalCount(total);
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
       disabled={page >= totalPages || isLoadingPage}
       onClick={async () => {
         if (page >= totalPages) return;
         setIsLoadingPage(true);
         try {
           const { data, total } = await getClientiPaginated(page + 1, pageSize, search.trim() || null);
           setClienti(data);
           setTotalCount(total);
           setPage((p) => p + 1);
         } finally {
           setIsLoadingPage(false);
         }
       }}
     >
       Successiva
     </Button>
   </div>
  </div>
</DataGrid>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px]">
 <DialogHeader className="mb-2">
 <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
 {editingCliente ? "MODIFICA CLIENTE" : "NUOVO CLIENTE"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
 <ClienteForm
 defaultValues={editingCliente || undefined}
 onSuccess={() => setIsOpen(false)}
 />
 </div>
 </DialogContent>
 </Dialog>

 </div>
 );
}

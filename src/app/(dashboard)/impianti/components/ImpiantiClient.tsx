"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react";
import {
  DataGrid,
  DataGridScroll,
  DataGridHead,
  DataGridBody,
  DataGridEmpty,
  GridRow,
  GridCell,
  ColumnHeader,
  TipologiaBadge,
  AzionamentoBadge,
} from "@/components/datagrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImpiantoForm } from "./ImpiantoForm";
import {
  deleteImpianto,
  getImpiantiPaginated,
  fetchImpiantiGlideRows,
  processaBatchImpiantiGlide,
} from "../actions";
import { TableSearch } from "@/components/table/TableSearch";

const IMPIANTI_GRID_COLUMNS = "120px minmax(180px, 2fr) minmax(140px, 1.2fr) minmax(180px, 1.5fr) minmax(120px, 1fr) 120px minmax(100px, 0.9fr) 100px";

export function ImpiantiClient({
  initialImpianti,
  initialTotal,
  pageSize,
  clienti,
  amministratori,
  permissions,
}: {
  initialImpianti: any[];
  initialTotal: number;
  pageSize: number;
  clienti: any[];
  amministratori: any[];
  permissions: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  const [impianti, setImpianti] = useState<any[]>(initialImpianti);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let cancelled = false;
    setIsLoadingPage(true);
    getImpiantiPaginated(page, pageSize, search.trim() || null).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        if (res.forbidden) window.location.href = "/";
        setIsLoadingPage(false);
        return;
      }
      setImpianti(res.data);
      setTotalCount(res.total);
      setIsLoadingPage(false);
    });
    return () => { cancelled = true; };
  }, [page, search, pageSize]);

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

 useEffect(() => {
 if (searchParams.get("new") === "true" && canCreate) {
 setEditingData(null);
 setIsOpen(true);
 router.replace(pathname);
 }
 }, [searchParams, canCreate, pathname, router]);

 const openDetailById = (impiantoId: string) => {
   router.push(`/impianti/${impiantoId}`);
 };

 useEffect(() => {
   const i = searchParams.get("i");
   if (i) router.replace(`/impianti/${i}`);
 }, [searchParams, router]);

 const handleEdit = (data: any) => {
 const safeData = { ...data };
 Object.keys(safeData).forEach((key) => {
 if (safeData[key] === null) safeData[key] = "";
 });
 setEditingData(safeData);
 setIsOpen(true);
 };

 const handleAddNew = () => {
 setEditingData(null);
 setIsOpen(true);
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questo impianto? I contratti associati potrebbero essere eliminati.")) {
 await deleteImpianto(id);
 }
 };

 const handleSyncGlide = async () => {
   setIsSyncing(true);
   setSyncProgress({ current: 0, total: 0 });
   try {
     const resList = await fetchImpiantiGlideRows();
     if (!resList.success || !resList.rows) {
       const errMsg = !resList.success ? (resList as { error?: string }).error : undefined;
       alert(errMsg || "Errore nel recupero impianti da Glide");
       return;
     }
     const total = resList.rows.length;
     if (total === 0) {
       alert("Nessun impianto trovato su Glide.");
       return;
     }
     setSyncProgress({ current: 0, total });
     const batchSize = 25;
     let processed = 0;
     for (let i = 0; i < total; i += batchSize) {
       const batch = resList.rows.slice(i, i + batchSize);
       const resBatch = await processaBatchImpiantiGlide(batch);
       if (!resBatch.success) {
         console.error(resBatch.error);
       }
       processed += batch.length;
       setSyncProgress({ current: Math.min(processed, total), total });
     }
     alert(`Sincronizzazione completata: ${total} impianti elaborati.`);
     window.location.reload();
   } finally {
     setIsSyncing(false);
     setSyncProgress(null);
   }
};

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Impianti</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione ascensori e montacarichi</p>
 </div>
 <div className="flex flex-wrap gap-3 w-full sm:w-auto">
 {canCreate && (
 <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Plus className="mr-2 h-5 w-5" /> NUOVO IMPIANTO
 </Button>
 )}
 {canCreate && (
 <Button onClick={handleSyncGlide} disabled={isSyncing} size="lg" className="w-full sm:w-auto uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-md">
 <RefreshCcw className={`mr-2 h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} /> 
 {isSyncing ? `Sincronizzo... ${syncProgress && syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) + '%' : ''}` : 'Sincronizza da Glide'}
 </Button>
 )}
 </div>
 </div>

<DataGrid className="overflow-hidden w-full max-w-full">
  <div className="flex justify-start px-4 pt-4 pb-4 w-full">
    <TableSearch
      value={searchInput}
      onChange={setSearchInput}
      placeholder="Cerca impianto, cliente, indirizzo..."
    />
  </div>
  <div className="overflow-x-auto pr-2 md:pr-4">
    {(impianti.length === 0 && !isLoadingPage) ? (
      <DataGridEmpty>Nessun impianto trovato.</DataGridEmpty>
    ) : isLoadingPage ? (
      <div className="datagrid__empty">Caricamento...</div>
    ) : (
      <>
  <div className="md:hidden space-y-3 px-4 pb-4">
    {impianti.map((item) => (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => openDetailById(item.id)}
        className="datagrid-mobile-card cursor-pointer"
      >
        <div className="datagrid-mobile-card__label">N° Impianto</div>
        <div className="datagrid-mobile-card__value font-semibold">{item.numeroImpianto || "—"}</div>
        <div className="datagrid-mobile-card__label">Indirizzo</div>
        <div className="datagrid-mobile-card__value">{item.indirizzo}</div>
        <div className="datagrid-mobile-card__label">Comune</div>
        <div className="datagrid-mobile-card__value text-sm">{(item.cap || "—")} {item.comune} ({item.provincia || "—"})</div>
        <div className="datagrid-mobile-card__label">Cliente · Amministratore</div>
        <div className="datagrid-mobile-card__value">{item.cliente?.denominazione} · {item.amministratore?.denominazione || "—"}</div>
        <div className="datagrid-mobile-card__label">Tipologia</div>
        <div className="datagrid-mobile-card__value"><TipologiaBadge value={item.tipologia} /></div>
        <div className="datagrid-mobile-card__label">Azionamento</div>
        <div className="datagrid-mobile-card__value"><AzionamentoBadge value={item.azionamento} /></div>
        <div className="flex gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
          {canUpdate && <Button variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
          {canDelete && <Button variant="outline" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-red-600"><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>
    ))}
  </div>
  <div className="hidden md:block w-full overflow-x-auto">
    <DataGridScroll maxHeight="60vh">
      <DataGridHead style={{ gridTemplateColumns: IMPIANTI_GRID_COLUMNS }}>
        <ColumnHeader>N° Impianto</ColumnHeader>
        <ColumnHeader>Indirizzo</ColumnHeader>
        <ColumnHeader>Comune</ColumnHeader>
        <ColumnHeader>Cliente</ColumnHeader>
        <ColumnHeader>Amministratore</ColumnHeader>
        <ColumnHeader>Tipologia</ColumnHeader>
        <ColumnHeader>Azionamento</ColumnHeader>
        <ColumnHeader>Azioni</ColumnHeader>
      </DataGridHead>
      <DataGridBody>
        {impianti.map((item) => (
            <GridRow
              key={item.id}
              clickable
              style={{ gridTemplateColumns: IMPIANTI_GRID_COLUMNS }}
              onClick={() => openDetailById(item.id)}
            >
              <GridCell truncate>{item.numeroImpianto || "—"}</GridCell>
              <GridCell truncate>{item.indirizzo}</GridCell>
              <GridCell truncate>{(item.cap || "—")} {item.comune} ({item.provincia || "—"})</GridCell>
              <GridCell truncate>{item.cliente?.denominazione || "—"}</GridCell>
              <GridCell truncate>{item.amministratore?.denominazione || "—"}</GridCell>
              <GridCell><TipologiaBadge value={item.tipologia} /></GridCell>
              <GridCell><AzionamentoBadge value={item.azionamento} /></GridCell>
              <GridCell align="actions" onClick={(e) => e.stopPropagation()}>
                {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>}
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
      <span className="font-semibold">{totalPages}</span> — {totalCount} impianti
    </span>
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1 || isLoadingPage}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
      >
        Precedente
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages || isLoadingPage}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
 {editingData ? "MODIFICA IMPIANTO" : "NUOVO IMPIANTO"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
 <ImpiantoForm
 defaultValues={editingData || undefined}
 clienti={clienti}
 amministratori={amministratori}
 onSuccess={async () => {
   setIsOpen(false);
   const res = await getImpiantiPaginated(page, pageSize, search.trim() || null);
   if (res.ok) {
     setImpianti(res.data);
     setTotalCount(res.total);
   }
 }}
 />
 </div>
 </DialogContent>
 </Dialog>

 </div>
 );
}

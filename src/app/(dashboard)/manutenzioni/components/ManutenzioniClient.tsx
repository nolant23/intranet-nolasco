"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManutenzioneForm } from "./ManutenzioneForm";
import { deleteManutenzione, getManutenzioneById, getManutenzioniPaginated } from "../actions";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";
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
} from "@/components/datagrid";

const MANUTENZIONI_GRID_COLUMNS = "0.75fr 2fr 1.2fr 1.5fr 100px";

export function ManutenzioniClient({
  initialManutenzioni,
  initialTotal,
  pageSize,
  impiantiDaManutenere,
  tecnici,
  currentUser,
  permissions,
}: {
  initialManutenzioni: any[];
  initialTotal: number;
  pageSize: number;
  impiantiDaManutenere: any[];
  tecnici: any[];
  currentUser: any;
  permissions: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [manutenzioni, setManutenzioni] = useState<any[]>(initialManutenzioni);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const isInitialFetch = useRef(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const canCreate = permissions?.CREATE;
  const canUpdate = permissions?.UPDATE;
  const canDelete = permissions?.DELETE;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Debounce search → dopo 500ms aggiorna search e torna a pagina 1
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch pagina quando cambiano page o search (salto il primo mount)
  useEffect(() => {
    if (isInitialFetch.current) {
      isInitialFetch.current = false;
      return;
    }
    let cancelled = false;
    setIsLoadingPage(true);
    getManutenzioniPaginated(page, pageSize, search.trim() || null).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        if (res.forbidden) window.location.href = "/";
        setIsLoadingPage(false);
        return;
      }
      setManutenzioni(res.data);
      setTotalCount(res.total);
      setIsLoadingPage(false);
    });
    return () => { cancelled = true; };
  }, [page, search, pageSize]);

 useEffect(() => {
 if (searchParams.get("new") === "true" && canCreate) {
 setEditingData(null);
 setIsOpen(true);
 router.replace(pathname);
 }
 }, [searchParams, canCreate, pathname, router]);

 const handleEdit = (manutenzione: any) => {
 setEditingData(manutenzione);
 setIsOpen(true);
 };

 const handleAddNew = () => {
 setEditingData(null);
 setIsOpen(true);
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questa manutenzione?")) {
 const res = await deleteManutenzione(id);
 if (res.success) {
 window.location.reload();
 } else {
 alert(res.error || "Errore durante l'eliminazione");
 }
 }
 };

 const handleOpenDetail = (manutenzione: any) => {
   setDetailId(manutenzione.id);
   setDetailData(null);
 };

 useEffect(() => {
   if (!detailId) {
     setDetailData(null);
     setLoadingDetail(false);
     return;
   }
   let cancelled = false;
   setLoadingDetail(true);
   getManutenzioneById(detailId).then((res) => {
     if (cancelled) return;
     setLoadingDetail(false);
     if (res?.success && (res as any).data) setDetailData((res as any).data);
     else setDetailData(null);
   });
   return () => { cancelled = true; };
 }, [detailId]);

 useEffect(() => {
   const mId = searchParams.get("m");
   if (mId) {
     setDetailId(mId);
     router.replace(pathname);
   }
 }, [searchParams, pathname, router]);

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Manutenzioni</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione interventi periodici</p>
 </div>
 <div className="flex flex-wrap gap-3">
 <Button
   onClick={handleAddNew}
   size="lg"
   type="button"
   className={cn("w-full sm:w-auto uppercase tracking-wider", !canCreate && "hidden")}
 >
 <Plus className="mr-2 h-5 w-5" /> NUOVA MANUTENZIONE
 </Button>
 </div>
 </div>

<DataGrid className="overflow-hidden">
<div className="flex justify-start px-4 pt-4 pb-4">
  <TableSearch
    value={searchInput}
    onChange={setSearchInput}
    placeholder="Cerca per impianto, tecnico, cliente..."
  />
</div>
<div className="overflow-x-auto pr-2 md:pr-4">
      {manutenzioni.length === 0 && !isLoadingPage ? (
        <DataGridEmpty>Nessuna manutenzione registrata.</DataGridEmpty>
      ) : isLoadingPage ? (
        <div className="datagrid__empty">Caricamento...</div>
      ) : (
        <>
        <div className="md:hidden space-y-3 px-4 pb-4">
          {manutenzioni.map((m) => {
            const addr = [m.impianto.indirizzo, (m.impianto.cap || ""), m.impianto.comune, m.impianto.provincia ? `(${m.impianto.provincia})` : ""].filter(Boolean).join(" ");
            return (
              <div key={m.id} onClick={() => handleOpenDetail(m)} className="datagrid-mobile-card cursor-pointer">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="datagrid-mobile-card__label">{new Date(m.dataManutenzione).toLocaleDateString("it-IT")}</p>
                    <p className="datagrid-mobile-card__value font-semibold">N. {m.impianto.numeroImpianto}</p>
                    <p className="text-sm text-slate-600">{addr}</p>
                    <p className="text-sm text-slate-500 mt-1">{m.tecnico.name} · {m.clienteFirmatario}</p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canUpdate && <Button type="button" variant="outline" size="icon" onClick={() => handleEdit(m)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button type="button" variant="outline" size="icon" onClick={() => handleDelete(m.id)} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden md:block">
          <DataGridScroll maxHeight="60vh">
            <DataGridHead style={{ gridTemplateColumns: MANUTENZIONI_GRID_COLUMNS }}>
              <ColumnHeader>Data</ColumnHeader>
              <ColumnHeader>Impianto</ColumnHeader>
              <ColumnHeader>Tecnico</ColumnHeader>
              <ColumnHeader>Cliente firmatario</ColumnHeader>
              <ColumnHeader>Azioni</ColumnHeader>
            </DataGridHead>
            <DataGridBody>
              {manutenzioni.map((m) => {
                const addr = [m.impianto.indirizzo, (m.impianto.cap || ""), m.impianto.comune, m.impianto.provincia ? `(${m.impianto.provincia})` : ""].filter(Boolean).join(" ");
                const impiantoLine = `N. ${m.impianto.numeroImpianto} · ${addr}`.trim();
                return (
                  <GridRow
                    key={m.id}
                    clickable
                    style={{ gridTemplateColumns: MANUTENZIONI_GRID_COLUMNS }}
                    onClick={() => handleOpenDetail(m)}
                  >
                    <GridCell>{new Date(m.dataManutenzione).toLocaleDateString("it-IT")}</GridCell>
                    <GridCell truncate>{impiantoLine}</GridCell>
                    <GridCell truncate>{m.tecnico.name}</GridCell>
                    <GridCell truncate>{m.clienteFirmatario}</GridCell>
                    <GridCell align="actions" onClick={(e) => e.stopPropagation()}>
                      {canUpdate && <Button type="button" variant="ghost" size="icon" onClick={() => handleEdit(m)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                    </GridCell>
                  </GridRow>
                );
              })}
            </DataGridBody>
          </DataGridScroll>
        </div>
        </>
      )}
 </div>
</DataGrid>

<div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl">
  <div className="text-xs sm:text-sm text-slate-600">
    Pagina <span className="font-semibold">{page}</span> di{" "}
    <span className="font-semibold">{totalPages}</span> —{" "}
    {totalCount} manutenzioni
  </div>
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

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px]">
 <DialogHeader className="mb-2">
 <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
 {editingData ? "MODIFICA MANUTENZIONE" : "NUOVA MANUTENZIONE"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
      <ManutenzioneForm
        defaultValues={editingData || undefined}
        impiantiDaManutenere={impiantiDaManutenere}
        tecnici={tecnici}
        currentUser={currentUser}
        onSuccess={async () => {
          setIsOpen(false);
          setEditingData(null);
          const res = await getManutenzioniPaginated(page, pageSize, search.trim() || null);
          if (res.ok) {
            setManutenzioni(res.data);
            setTotalCount(res.total);
          }
        }}
      />
 </div>
 </DialogContent>
 </Dialog>

 <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
 <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
   {loadingDetail ? (
     <div className="p-8 text-slate-500">Caricamento...</div>
   ) : detailData ? (
     <div className="p-6 space-y-6">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Dettaglio Manutenzione</h2>
         <div className="flex gap-2">
           {detailData.rapportinoPdf && (
             <a href={detailData.rapportinoPdf} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
               <FileDown className="h-4 w-4" /> Scarica rapportino
             </a>
           )}
           <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDetailId(null)}>Chiudi</Button>
         </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data / Ora</div>
           <div className="text-base font-semibold text-slate-900 mt-1">
             {new Date(detailData.dataManutenzione).toLocaleDateString("it-IT")}
             {detailData.oraEsecuzione ? ` — ${detailData.oraEsecuzione}` : ""}
           </div>
         </div>
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
           <div className="text-base font-semibold text-slate-900 mt-1">{detailData.tecnico?.name || "-"}</div>
         </div>
         <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
           <div className="text-base font-semibold text-slate-900 mt-1">
             {detailData.impianto ? (
               <ImpiantoDetailDialog impiantoId={detailData.impianto.id} className="text-blue-600 hover:underline">
                 Impianto {detailData.impianto.numeroImpianto || ""} — {detailData.impianto.indirizzo}, {detailData.impianto.comune}
               </ImpiantoDetailDialog>
             ) : "-"}
           </div>
         </div>
         <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
           <div className="text-base font-semibold text-slate-900 mt-1">{detailData.clienteFirmatario || "-"}</div>
         </div>
       </div>
       {detailData.effettuaSemestrale && (
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Controlli semestrali</div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {detailData.efficienzaParacadute != null && (
               <div>
                 <div className="text-xs text-slate-500">Efficienza paracadute</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.efficienzaParacadute ? "Sì" : "No"}</div>
               </div>
             )}
             {detailData.efficienzaLimitatoreVelocita != null && (
               <div>
                 <div className="text-xs text-slate-500">Efficienza limitatore di velocità</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.efficienzaLimitatoreVelocita ? "Sì" : "No"}</div>
               </div>
             )}
             {detailData.efficienzaDispositiviSicurezza != null && (
               <div>
                 <div className="text-xs text-slate-500">Efficienza dispositivi di sicurezza</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.efficienzaDispositiviSicurezza ? "Sì" : "No"}</div>
               </div>
             )}
             {detailData.condizioneFuni && (
               <div>
                 <div className="text-xs text-slate-500">Condizione delle funi</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.condizioneFuni}</div>
               </div>
             )}
             {detailData.condizioneIsolamentoImpianto && (
               <div>
                 <div className="text-xs text-slate-500">Condizione isolamento impianto elettrico</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.condizioneIsolamentoImpianto}</div>
               </div>
             )}
             {detailData.efficienzaCollegamentiTerra != null && (
               <div>
                 <div className="text-xs text-slate-500">Efficienza collegamenti con la terra</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.efficienzaCollegamentiTerra ? "Sì" : "No"}</div>
               </div>
             )}
             {detailData.condizioniAttacchiFuni && (
               <div>
                 <div className="text-xs text-slate-500">Condizioni attacchi funi</div>
                 <div className="text-sm font-medium text-slate-900">{detailData.condizioniAttacchiFuni}</div>
               </div>
             )}
             {detailData.osservazioniSemestrale && (
               <div className="md:col-span-2">
                 <div className="text-xs text-slate-500">Osservazioni</div>
                 <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.osservazioniSemestrale}</div>
               </div>
             )}
           </div>
         </div>
       )}
       {detailData.note && (
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note</div>
           <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.note}</div>
         </div>
       )}
       {(detailData.firmaTecnico || detailData.firmaCliente) && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {detailData.firmaTecnico && (
             <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma tecnico</div>
               <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center">
                 <img src={detailData.firmaTecnico} alt="Firma tecnico" className="max-h-full max-w-full object-contain" />
               </div>
             </div>
           )}
           {detailData.firmaCliente && (
             <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma cliente</div>
               <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center">
                 <img src={detailData.firmaCliente} alt="Firma cliente" className="max-h-full max-w-full object-contain" />
               </div>
             </div>
           )}
         </div>
       )}
     </div>
   ) : detailId ? (
     <div className="p-8 text-slate-500">Manutenzione non trovata.</div>
   ) : null}
 </DialogContent>
 </Dialog>

 </div>
 );
}

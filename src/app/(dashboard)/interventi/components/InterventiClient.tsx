"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, FileDown, Hammer } from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { InterventoForm } from "./InterventoForm";
import { deleteIntervento, getInterventiPaginated, getInterventoById } from "../actions";
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

const INTERVENTI_GRID_COLUMNS = "0.75fr 0.9fr 2.2fr 1fr 1fr 100px";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";

export function InterventiClient({
  initialInterventi,
  initialTotal,
  pageSize,
  impianti,
  tecnici,
  currentUser,
  permissions,
}: {
  initialInterventi: any[];
  initialTotal: number;
  pageSize: number;
  impianti: any[];
  tecnici: any[];
  currentUser: any;
  permissions: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [interventi, setInterventi] = useState<any[]>(initialInterventi);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const canCreate = permissions?.CREATE;
  const canUpdate = permissions?.UPDATE;
  const canDelete = permissions?.DELETE;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

 useEffect(() => {
 if (searchParams.get("new") === "true" && canCreate) {
 setEditingData(null);
 setIsOpen(true);
 router.replace(pathname);
 }
 }, [searchParams, canCreate, pathname, router]);

 const handleEdit = (intervento: any) => {
 setEditingData(intervento);
 setIsOpen(true);
 };

 const handleAddNew = () => {
 setEditingData(null);
 setIsOpen(true);
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questo intervento?")) {
 const res = await deleteIntervento(id);
 if (res.success) {
 window.location.reload();
 } else {
 alert(res.error || "Errore durante l'eliminazione");
 }
 }
 };

 const handleOpenDetail = (intervento: any) => {
 setDetailId(intervento.id);
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
 getInterventoById(detailId).then((res) => {
 if (cancelled) return;
 setLoadingDetail(false);
 if (res?.success && (res as any).data) setDetailData((res as any).data);
 else setDetailData(null);
 });
 return () => { cancelled = true; };
 }, [detailId]);

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Interventi</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione interventi e riparazioni su chiamata</p>
 </div>
 {canCreate && (
 <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Plus className="mr-2 h-5 w-5" /> NUOVO INTERVENTO
 </Button>
 )}
 </div>

 <DataGrid className="overflow-hidden">
 <div className="overflow-x-auto pr-2 md:pr-4">
      {interventi.length === 0 && !isLoadingPage ? (
        <DataGridEmpty>Nessun intervento registrato.</DataGridEmpty>
      ) : isLoadingPage ? (
        <div className="datagrid__empty">Caricamento...</div>
      ) : (
        <>
        <div className="md:hidden space-y-3 px-4 pb-4">
          {interventi.map((m) => (
            <div key={m.id} className="datagrid-mobile-card cursor-pointer" onClick={() => handleOpenDetail(m)} role="button" tabIndex={0}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="datagrid-mobile-card__label">{m.numeroRapportino ? `N. ${m.numeroRapportino}` : "-"}</p>
                  <p className="datagrid-mobile-card__value font-semibold">{new Date(m.dataIntervento).toLocaleDateString("it-IT")} {m.oraInizio}</p>
                  <p className="text-sm text-slate-700">N. {m.impianto.numeroImpianto}</p>
                  <p className="text-sm text-slate-600">{m.impianto.indirizzo}, {m.impianto.comune}</p>
                  <p className="text-sm text-slate-500 mt-1">{m.tecnico.name} · {m.clienteFirmatario}</p>
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canUpdate && <Button type="button" variant="outline" size="icon" onClick={() => handleEdit(m)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
                  {canDelete && <Button type="button" variant="outline" size="icon" onClick={() => handleDelete(m.id)} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <DataGridScroll maxHeight="60vh">
            <DataGridHead style={{ gridTemplateColumns: INTERVENTI_GRID_COLUMNS }}>
              <ColumnHeader>Rapportino</ColumnHeader>
              <ColumnHeader>Data e ora</ColumnHeader>
              <ColumnHeader>Impianto</ColumnHeader>
              <ColumnHeader>Tecnico</ColumnHeader>
              <ColumnHeader>Cliente</ColumnHeader>
              <ColumnHeader>Azioni</ColumnHeader>
            </DataGridHead>
            <DataGridBody>
              {interventi.map((m) => {
                const impiantoLine = m.impianto.indirizzo ? `N. ${m.impianto.numeroImpianto} · ${m.impianto.indirizzo}, ${m.impianto.comune}` : `N. ${m.impianto.numeroImpianto} · ${m.impianto.comune}`;
                return (
                  <GridRow
                    key={m.id}
                    clickable
                    style={{ gridTemplateColumns: INTERVENTI_GRID_COLUMNS }}
                    onClick={() => handleOpenDetail(m)}
                  >
                    <GridCell>{m.numeroRapportino ? `N. ${m.numeroRapportino}` : "-"}</GridCell>
                    <GridCell>{new Date(m.dataIntervento).toLocaleDateString("it-IT")} {m.oraInizio}</GridCell>
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
    {totalCount} interventi
  </div>
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
          const { data, total } = await getInterventiPaginated(page - 1, pageSize);
          setInterventi(data);
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
          const { data, total } = await getInterventiPaginated(page + 1, pageSize);
          setInterventi(data);
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

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px]">
 <DialogHeader className="mb-2">
 <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
 {editingData ? "MODIFICA INTERVENTO" : "NUOVO INTERVENTO"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
 <InterventoForm
 defaultValues={editingData || undefined}
 impianti={impianti}
 tecnici={tecnici}
 currentUser={currentUser}
 onSuccess={() => {
 setIsOpen(false);
 window.location.reload();
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
         <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Dettaglio Intervento</h2>
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
         {detailData.numeroRapportino && (
           <div className="rounded-xl border border-slate-200 p-4">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N° Rapportino</div>
             <div className="text-lg font-black text-slate-900 mt-1">{detailData.numeroRapportino}</div>
           </div>
         )}
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</div>
           <div className="text-base font-semibold text-slate-900 mt-1">
             {detailData.dataIntervento ? new Date(detailData.dataIntervento).toLocaleDateString("it-IT") : "-"}
           </div>
         </div>
         <div className="rounded-xl border border-slate-200 p-4">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
           <div className="text-base font-semibold text-slate-900 mt-1">{detailData.tecnico?.name || "-"}</div>
         </div>
         {detailData.impianto && (
           <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
             <ImpiantoDetailDialog impiantoId={detailData.impianto.id} className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block">
               {detailData.impianto.numeroImpianto || ""} — {detailData.impianto.indirizzo}, {detailData.impianto.comune}
             </ImpiantoDetailDialog>
           </div>
         )}
         {(detailData.descrizioneIntervento || detailData.descrizione) && (
           <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrizione</div>
             <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.descrizioneIntervento || detailData.descrizione}</div>
           </div>
         )}
         {detailData.clienteFirmatario && (
           <div className="rounded-xl border border-slate-200 p-4">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
             <div className="text-base font-semibold text-slate-900 mt-1">{detailData.clienteFirmatario}</div>
           </div>
         )}
       </div>
     </div>
   ) : detailId ? (
     <div className="p-8 text-slate-500">Intervento non trovato.</div>
   ) : null}
 </DialogContent>
 </Dialog>
 </div>
 );
}

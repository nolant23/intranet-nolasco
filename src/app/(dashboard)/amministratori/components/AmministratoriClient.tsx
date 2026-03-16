"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmministratoreForm } from "./AmministratoreForm";
import {
  deleteAmministratore,
  fetchAmministratoriGlideRows,
  processaBatchAmministratoriGlide,
} from "../actions";
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

const AMMINISTRATORI_GRID_COLUMNS = "2.4fr 1.2fr 1.2fr 1.6fr 100px";

export function AmministratoriClient({ amministratori, permissions }: { amministratori: any[], permissions: any }) {
 const router = useRouter();

 const [isOpen, setIsOpen] = useState(false);
 const [editingData, setEditingData] = useState<any>(null);
 const [isSyncing, setIsSyncing] = useState(false);
 const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
 const [search, setSearch] = useState("");

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

 const openDetailById = (amministratoreId: string) => {
   router.push(`/amministratori/${amministratoreId}`);
 };

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

 const handleSyncGlide = async () => {
   setIsSyncing(true);
   setSyncProgress({ current: 0, total: 0 });
   try {
     const resList = await fetchAmministratoriGlideRows();
     if (!resList.success || !resList.rows) {
       alert(resList.error || "Errore nel recupero amministratori da Glide");
       return;
     }
     const total = resList.rows.length;
     if (total === 0) {
       alert("Nessun amministratore trovato su Glide.");
       return;
     }
     setSyncProgress({ current: 0, total });
     const batchSize = 25;
     let processed = 0;
     for (let i = 0; i < total; i += batchSize) {
       const batch = resList.rows.slice(i, i + batchSize);
       const resBatch = await processaBatchAmministratoriGlide(batch);
       if (!resBatch.success) {
         console.error(resBatch.error);
       }
       processed += batch.length;
       setSyncProgress({ current: Math.min(processed, total), total });
     }
     alert(`Sincronizzazione completata: ${total} amministratori elaborati.`);
     window.location.reload();
   } finally {
     setIsSyncing(false);
     setSyncProgress(null);
   }
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questo amministratore?")) {
 await deleteAmministratore(id);
 }
};

const filteredAmministratori = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return amministratori;
  return amministratori.filter((a: any) =>
    [
      a.denominazione,
      a.comune,
      a.provincia,
      a.email,
      a.pec,
      a.cellulare,
      a.telefono,
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  );
}, [amministratori, search]);

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Amministratori</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione studi condominiali</p>
 </div>
 <div className="flex flex-wrap gap-3 w-full sm:w-auto">
 {canCreate && (
 <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Plus className="mr-2 h-5 w-5" /> NUOVO AMMINISTRATORE
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

<DataGrid className="overflow-hidden">
  <div className="flex justify-start px-4 pt-4 pb-4">
    <TableSearch
      value={search}
      onChange={setSearch}
      placeholder="Cerca amministratore, comune, email..."
    />
  </div>
  <div className="overflow-x-auto pr-2 md:pr-4">
    {filteredAmministratori.length === 0 ? (
      <DataGridEmpty>Nessun amministratore trovato.</DataGridEmpty>
    ) : (
      <>
        <div className="md:hidden space-y-3 px-4 pb-4">
          {filteredAmministratori.map((item) => (
            <div key={item.id} onClick={() => openDetailById(item.id)} className="datagrid-mobile-card cursor-pointer">
              <div className="datagrid-mobile-card__value font-semibold text-slate-900">{item.denominazione}</div>
              <div className="text-sm text-slate-600 mt-0.5">{item.comune}{item.provincia ? ` (${item.provincia})` : ""}{item.cap ? ` · ${item.cap}` : ""}</div>
              <div className="text-sm text-slate-500 mt-0.5">{item.email || item.pec || "-"}</div>
              <div className="text-sm text-slate-500">{item.cellulare || item.telefono || "-"}</div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                {canUpdate && (
                  <Button variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-9 w-9">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outline" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <DataGridScroll maxHeight="60vh">
            <DataGridHead style={{ gridTemplateColumns: AMMINISTRATORI_GRID_COLUMNS }}>
              <ColumnHeader>Denominazione</ColumnHeader>
              <ColumnHeader>Comune</ColumnHeader>
              <ColumnHeader>Email / PEC</ColumnHeader>
              <ColumnHeader>Contatti</ColumnHeader>
              <ColumnHeader>Azioni</ColumnHeader>
            </DataGridHead>
            <DataGridBody>
              {filteredAmministratori.map((item) => (
                <GridRow
                  key={item.id}
                  clickable
                  style={{ gridTemplateColumns: AMMINISTRATORI_GRID_COLUMNS }}
                  onClick={() => openDetailById(item.id)}
                >
                  <GridCell truncate>{item.denominazione}</GridCell>
                  <GridCell truncate>{item.comune}{item.provincia ? ` (${item.provincia})` : ""}</GridCell>
                  <GridCell truncate>{item.email || item.pec || "-"}</GridCell>
                  <GridCell truncate>{item.cellulare || item.telefono || "-"}</GridCell>
                  <GridCell align="actions" onClick={(e) => e.stopPropagation()}>
                    {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                  </GridCell>
                </GridRow>
              ))}
            </DataGridBody>
          </DataGridScroll>
        </div>
      </>
    )}
  </div>
</DataGrid>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px]">
 <DialogHeader className="mb-2">
 <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
 {editingData ? "MODIFICA AMMINISTRATORE" : "NUOVO AMMINISTRATORE"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
 <AmministratoreForm
 defaultValues={editingData || undefined}
 onSuccess={() => setIsOpen(false)}
 />
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

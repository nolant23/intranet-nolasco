"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  DataGrid,
  DataGridScroll,
  DataGridHead,
  DataGridBody,
  DataGridEmpty,
  GridRow,
  GridCell,
  ColumnHeader,
  RoleBadge,
} from "@/components/datagrid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UtenteForm } from "./UtenteForm";
import { deleteUtente } from "../actions";

const UTENTI_GRID_COLUMNS = "1fr 1.5fr 120px 100px";

export function UtentiClient({ utenti, permissions }: { utenti: any[], permissions: any }) {
 const [isOpen, setIsOpen] = useState(false);
 const [editingUtente, setEditingUtente] = useState<any>(null);

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

 const handleEdit = (utente: any) => {
 setEditingUtente(utente);
 setIsOpen(true);
 };

 const handleAddNew = () => {
 setEditingUtente(null);
 setIsOpen(true);
 };

 const handleDelete = async (id: string) => {
 if (confirm("Sei sicuro di voler eliminare questo utente?")) {
 await deleteUtente(id);
 }
 };

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Utenti</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione accessi e permessi (Solo Admin)</p>
 </div>
 {canCreate && (
 <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Plus className="mr-2 h-5 w-5" /> NUOVO UTENTE
 </Button>
 )}
 </div>

 <DataGrid className="overflow-hidden">
   <div className="md:hidden space-y-3 p-4">
     {utenti.map((utente) => (
       <div key={utente.id} className="datagrid-mobile-card">
         <div className="datagrid-mobile-card__label">Nome</div>
         <div className="datagrid-mobile-card__value font-semibold">{utente.name}</div>
         <div className="datagrid-mobile-card__label">Email</div>
         <div className="datagrid-mobile-card__value">{utente.email}</div>
         <div className="datagrid-mobile-card__label">Ruolo</div>
         <div className="datagrid-mobile-card__value"><RoleBadge value={utente.role} /></div>
         <div className="flex gap-2 pt-3">
           {canUpdate && <Button variant="outline" size="icon" onClick={() => handleEdit(utente)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
           {canDelete && <Button variant="outline" size="icon" onClick={() => handleDelete(utente.id)} className="h-9 w-9 text-red-600"><Trash2 className="h-4 w-4" /></Button>}
         </div>
       </div>
     ))}
     {utenti.length === 0 && <DataGridEmpty>Nessun utente trovato.</DataGridEmpty>}
   </div>
   <div className="hidden md:block overflow-x-auto">
     <DataGridScroll maxHeight="60vh">
       <DataGridHead style={{ gridTemplateColumns: UTENTI_GRID_COLUMNS }}>
         <ColumnHeader>Nome e Cognome</ColumnHeader>
         <ColumnHeader>Email</ColumnHeader>
         <ColumnHeader>Ruolo</ColumnHeader>
         <ColumnHeader>Azioni</ColumnHeader>
       </DataGridHead>
       <DataGridBody>
         {utenti.length === 0 ? (
           <DataGridEmpty>Nessun utente trovato.</DataGridEmpty>
         ) : (
           utenti.map((utente) => (
             <GridRow key={utente.id} style={{ gridTemplateColumns: UTENTI_GRID_COLUMNS }}>
               <GridCell truncate>{utente.name}</GridCell>
               <GridCell truncate>{utente.email}</GridCell>
               <GridCell><RoleBadge value={utente.role} /></GridCell>
               <GridCell align="actions">
                 {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleEdit(utente)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                 {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(utente.id)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>}
               </GridCell>
             </GridRow>
           ))
         )}
       </DataGridBody>
     </DataGridScroll>
   </div>
 </DataGrid>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px]">
 <DialogHeader className="mb-2">
 <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
 {editingUtente ? "MODIFICA UTENTE" : "NUOVO UTENTE"}
 </DialogTitle>
 </DialogHeader>
 <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
 <UtenteForm
 defaultValues={editingUtente || undefined}
 onSuccess={() => setIsOpen(false)}
 />
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

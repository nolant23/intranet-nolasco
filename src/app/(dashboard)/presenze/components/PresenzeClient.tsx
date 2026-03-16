"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Save, Sparkles, Filter, Trash2, FileDown } from "lucide-react";
import "@/components/table/grid-table.css";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { generaPresenze, getPresenze, updatePresenza, deletePresenza, deletePresenzeMultiple, exportPresenzePDF } from "../actions";
import { Checkbox } from "@/components/ui/checkbox";

const MESI = [
 { value: "1", label: "Gennaio" },
 { value: "2", label: "Febbraio" },
 { value: "3", label: "Marzo" },
 { value: "4", label: "Aprile" },
 { value: "5", label: "Maggio" },
 { value: "6", label: "Giugno" },
 { value: "7", label: "Luglio" },
 { value: "8", label: "Agosto" },
 { value: "9", label: "Settembre" },
 { value: "10", label: "Ottobre" },
 { value: "11", label: "Novembre" },
 { value: "12", label: "Dicembre" },
];

const ANNI = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i)); // Da 2 anni fa a 2 anni nel futuro

export function PresenzeClient({
  tecnici,
  permissions,
  currentUser,
  backHref,
}: {
  tecnici: any[];
  permissions: any;
  currentUser: any;
  backHref?: string;
}) {
 const currentMonth = String(new Date().getMonth() + 1);
 const currentYear = String(new Date().getFullYear());

 const isTecnico = currentUser?.role === "TECNICO";
 const initialTecnicoId = isTecnico ? currentUser.id : "ALL";

 const [mese, setMese] = useState(currentMonth);
 const [anno, setAnno] = useState(currentYear);
 const [tecnicoId, setTecnicoId] = useState(initialTecnicoId);
 
 const [presenze, setPresenze] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isGenerating, setIsGenerating] = useState(false);
 const [isExporting, setIsExporting] = useState(false);

 // State for inline editing
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editForm, setEditForm] = useState<any>({});
 
 // Selection state for multiple delete
 const [selectedIds, setSelectedIds] = useState<string[]>([]);

 const canCreate = permissions?.CREATE;
 const canUpdate = permissions?.UPDATE;
 const canDelete = permissions?.DELETE;

 const loadPresenze = async () => {
 setIsLoading(true);
 try {
 const data = await getPresenze(parseInt(mese), parseInt(anno), tecnicoId);
 setPresenze(data);
 setSelectedIds([]); // Clear selection on load
 } catch (e) {
 console.error(e);
 }
 setIsLoading(false);
 };

 useEffect(() => {
 loadPresenze();
 }, [mese, anno, tecnicoId]);

 const handleGenerate = async () => {
 if (!confirm(`Sei sicuro di voler generare/sovrascrivere le presenze per tutti i tecnici per ${MESI.find(m => m.value === mese)?.label} ${anno}?`)) {
 return;
 }
 setIsGenerating(true);
 const res = await generaPresenze(parseInt(mese), parseInt(anno));
 if (res.success) {
 await loadPresenze();
 alert("Presenze generate con successo!");
 } else {
 alert(res.error || "Errore durante la generazione");
 }
 setIsGenerating(false);
 };

 const handleExport = async () => {
 setIsExporting(true);
 const res = await exportPresenzePDF(parseInt(mese), parseInt(anno), tecnicoId);
 if (res.success && res.url) {
 window.open(res.url, '_blank');
 } else {
 alert(res.error || "Errore durante l'esportazione");
 }
 setIsExporting(false);
 };

 const startEdit = (p: any) => {
 setEditingId(p.id);
 setEditForm({
 oreOrdinario: p.oreOrdinario || 0,
 orePermesso: p.orePermesso || 0,
 oreMalattia: p.oreMalattia || 0,
 oreStraordinario: p.oreStraordinario || 0,
 oreFestivo: p.oreFestivo || 0,
 oreFerie: p.oreFerie || 0,
 });
 };

 const handleSaveEdit = async () => {
 if (!editingId) return;
 const res = await updatePresenza(editingId, editForm);
 if (res.success) {
 setEditingId(null);
 loadPresenze();
 } else {
 alert(res.error || "Errore durante il salvataggio");
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Sei sicuro di voler eliminare questa presenza?")) return;
 const res = await deletePresenza(id);
 if (res.success) {
 loadPresenze();
 } else {
 alert(res.error || "Errore durante l'eliminazione");
 }
 };

 const handleBulkDelete = async () => {
 if (selectedIds.length === 0) return;
 if (!confirm(`Sei sicuro di voler eliminare le ${selectedIds.length} presenze selezionate?`)) return;
 
 const res = await deletePresenzeMultiple(selectedIds);
 if (res.success) {
 loadPresenze();
 } else {
 alert(res.error || "Errore durante l'eliminazione multipla");
 }
 };

 const toggleSelectAll = (checked: boolean) => {
 if (checked) {
 setSelectedIds(presenze.map(p => p.id));
 } else {
 setSelectedIds([]);
 }
 };

 const toggleSelect = (id: string, checked: boolean) => {
 if (checked) {
 setSelectedIds(prev => [...prev, id]);
 } else {
 setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
 }
 };

 const getGiornoSettimana = (dateString: string) => {
 const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
 return days[new Date(dateString).getDay()];
 };

 let totOrd = 0, totPerm = 0, totMal = 0, totStr = 0, totFes = 0, totFer = 0;
 if (tecnicoId !== "ALL") {
 presenze.forEach(p => {
 totOrd += p.oreOrdinario || 0;
 totPerm += p.orePermesso || 0;
 totMal += p.oreMalattia || 0;
 totStr += p.oreStraordinario || 0;
 totFes += p.oreFestivo || 0;
 totFer += p.oreFerie || 0;
 });
 }

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 {backHref && (
   <Link
     href={backHref}
     className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold w-fit"
   >
     <ArrowLeft className="h-5 w-5" /> Indietro
   </Link>
 )}
 <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Presenze</h1>
 <p className="text-slate-500 font-medium mt-1">Gestione ore lavorative tecnici</p>
 </div>

 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
 <Select value={mese} onValueChange={(val) => val && setMese(val)}>
 <SelectTrigger className="w-full sm:w-[140px] font-medium" id="select-mese">
 <SelectValue placeholder="Mese">
 {MESI.find(m => m.value === mese)?.label}
 </SelectValue>
 </SelectTrigger>
 <SelectContent>
 {MESI.map(m => (
 <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={anno} onValueChange={(val) => val && setAnno(val)}>
 <SelectTrigger className="w-full sm:w-[120px] font-medium" id="select-anno">
 <SelectValue placeholder="Anno" />
 </SelectTrigger>
 <SelectContent>
 {ANNI.map(a => (
 <SelectItem key={a} value={a}>{a}</SelectItem>
 ))}
 </SelectContent>
 </Select>

 {!isTecnico && (
 <Select value={tecnicoId} onValueChange={(val) => val && setTecnicoId(val)}>
 <SelectTrigger className="w-full sm:w-[200px] font-medium" id="select-tecnico">
 <SelectValue placeholder="Tutti">
 {tecnicoId === "ALL" ? "Tutti" : tecnici.find(t => t.id === tecnicoId)?.name}
 </SelectValue>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ALL">Tutti</SelectItem>
 {tecnici.map(t => (
 <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}

 {canCreate && (
 <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="w-full sm:w-auto uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white">
 <Sparkles className="mr-2 h-5 w-5" /> {isGenerating ? 'Generazione...' : 'Genera Presenze'}
 </Button>
 )}

 <Button onClick={handleExport} disabled={isExporting || presenze.length === 0} size="lg" className="w-full sm:w-auto uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white">
 <FileDown className="mr-2 h-5 w-5" /> {isExporting ? 'Esportazione...' : 'Esporta PDF'}
 </Button>
 
 {canDelete && selectedIds.length > 0 && (
 <Button onClick={handleBulkDelete} variant="destructive" size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 <Trash2 className="mr-2 h-5 w-5" /> Elimina ({selectedIds.length})
 </Button>
 )}
 </div>
 </div>

 {tecnicoId !== "ALL" && presenze.length > 0 && (
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 text-center">
 {tecnici.find(t => t.id === tecnicoId)?.name}
 </h2>
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ordinario</span>
 <span className="text-2xl font-black text-slate-900">{totOrd}</span>
 </div>
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Permesso</span>
 <span className="text-2xl font-black text-slate-900">{totPerm}</span>
 </div>
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Malattia</span>
 <span className="text-2xl font-black text-slate-900">{totMal}</span>
 </div>
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Straord.</span>
 <span className="text-2xl font-black text-slate-900">{totStr}</span>
 </div>
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Festivo</span>
 <span className="text-2xl font-black text-slate-900">{totFes}</span>
 </div>
 <div className="flex flex-col bg-slate-50 p-4 rounded-xl">
 <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ferie</span>
 <span className="text-2xl font-black text-slate-900">{totFer}</span>
 </div>
 </div>
 </div>
 )}

 <div className="grid-table-card overflow-hidden">
 {(() => {
   const gridCols = [
     canDelete && "48px",
     "1fr",
     tecnicoId === "ALL" && "1.2fr",
     "0.8fr", "0.8fr", "0.8fr", "0.8fr", "0.8fr", "0.8fr",
     (canUpdate || canDelete) && "1fr",
   ].filter(Boolean).join(" ");
   return (
     <>
       {/* Mobile cards */}
       <div className="md:hidden space-y-3">
         {!isLoading && presenze.length > 0 && presenze.map((p) => {
           const dataGiorno = new Date(p.data);
           const isWeekend = dataGiorno.getDay() === 0 || dataGiorno.getDay() === 6;
           const isSelected = selectedIds.includes(p.id);
           const isEditing = editingId === p.id;
           return (
             <div
               key={p.id}
               className={`grid-table-mobile-card ${isWeekend ? "bg-orange-50/30" : ""} ${isSelected ? "border-indigo-400 bg-indigo-50/50" : ""}`}
             >
               <div className="grid-table-mobile-card__label">Data</div>
               <div className="grid-table-mobile-card__value font-bold">{dataGiorno.toLocaleDateString("it-IT")} · {getGiornoSettimana(p.data)}</div>
               {tecnicoId === "ALL" && (
                 <>
                   <div className="grid-table-mobile-card__label">Tecnico</div>
                   <div className="grid-table-mobile-card__value">{p.tecnico?.name}</div>
                 </>
               )}
               <div className="grid-table-mobile-card__label">Ore</div>
               <div className="grid-table-mobile-card__value">
                 Ord. {p.oreOrdinario ?? "-"} · Perm. {p.orePermesso ?? "-"} · Mal. {p.oreMalattia ?? "-"} · Str. {p.oreStraordinario ?? "-"} · Fest. {p.oreFestivo ?? "-"} · Ferie {p.oreFerie ?? "-"}
               </div>
               {(canUpdate || canDelete) && (
                 <div className="pt-3 flex gap-2">
                   {isEditing ? (
                     <>
                       <Button onClick={() => setEditingId(null)} variant="ghost" size="sm" className="h-8">Annulla</Button>
                       <Button onClick={handleSaveEdit} size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">Salva</Button>
                     </>
                   ) : (
                     <>
                       {canUpdate && <Button onClick={() => startEdit(p)} variant="outline" size="sm" className="h-8 text-xs">Modifica</Button>}
                       {canDelete && <Button onClick={() => handleDelete(p.id)} variant="outline" size="icon" className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                     </>
                   )}
                 </div>
               )}
             </div>
           );
         })}
         {isLoading && <div className="text-center text-slate-500 font-medium py-12">Caricamento in corso...</div>}
         {!isLoading && presenze.length === 0 && <div className="text-center text-slate-500 font-medium py-12">Nessuna presenza trovata. Clicca su &quot;Genera Presenze&quot; per iniziare.</div>}
       </div>
       {/* Desktop grid */}
       <div className="hidden md:block overflow-x-auto">
         <div className="grid-table__scroll max-h-[60vh]" role="table">
           <div className="grid-table__head [&_.grid-table__head-cell]:sticky [&_.grid-table__head-cell]:top-0 [&_.grid-table__head-cell]:z-20 [&_.grid-table__head-cell]:bg-slate-50" style={{ gridTemplateColumns: gridCols }} role="row">
             {canDelete && (
               <div className="grid-table__head-cell py-4 grid-table__cell--center">
                 <Checkbox checked={presenze.length > 0 && selectedIds.length === presenze.length} onCheckedChange={toggleSelectAll} aria-label="Seleziona tutte" />
               </div>
             )}
             <div className="grid-table__head-cell py-4 font-bold text-slate-700">Data</div>
             {tecnicoId === "ALL" && <div className="grid-table__head-cell py-4 font-bold text-slate-700">Tecnico</div>}
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Ordinario</div>
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Permesso</div>
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Malattia</div>
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Straord.</div>
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Festivo</div>
             <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Ferie</div>
             {(canUpdate || canDelete) && <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--actions">Azioni</div>}
           </div>
           <div className="grid-table__body">
             {isLoading ? (
               <div className="grid-table__row" style={{ gridTemplateColumns: gridCols }}>
                 <div className="grid-table__cell text-center text-slate-500 font-medium py-12" style={{ gridColumn: "1 / -1" }}>Caricamento in corso...</div>
               </div>
             ) : presenze.length === 0 ? (
               <div className="grid-table__row" style={{ gridTemplateColumns: gridCols }}>
                 <div className="grid-table__cell text-center text-slate-500 font-medium py-12" style={{ gridColumn: "1 / -1" }}>Nessuna presenza trovata. Clicca su &quot;Genera Presenze&quot; per iniziare.</div>
               </div>
             ) : (
               presenze.map((p) => {
                 const isEditing = editingId === p.id;
                 const dataGiorno = new Date(p.data);
                 const isWeekend = dataGiorno.getDay() === 0 || dataGiorno.getDay() === 6;
                 const isSelected = selectedIds.includes(p.id);
                 return (
                   <div
                     key={p.id}
                     className={`grid-table__row ${isWeekend ? "bg-orange-50/30" : ""} ${isSelected ? "bg-indigo-50/50" : ""}`}
                     style={{ gridTemplateColumns: gridCols }}
                     role="row"
                   >
                     {canDelete && (
                       <div className="grid-table__cell py-3 grid-table__cell--center">
                         <Checkbox checked={isSelected} onCheckedChange={(c) => toggleSelect(p.id, c as boolean)} aria-label={`Seleziona ${p.tecnico?.name}`} />
                       </div>
                     )}
                     <div className="grid-table__cell py-3">
                       <div className="font-bold text-slate-900">{dataGiorno.toLocaleDateString("it-IT")}</div>
                       <div className="text-xs text-slate-500 font-medium">{getGiornoSettimana(p.data)}</div>
                     </div>
                     {tecnicoId === "ALL" && <div className="grid-table__cell py-3 font-medium text-slate-700">{p.tecnico?.name}</div>}
                     {["oreOrdinario", "orePermesso", "oreMalattia", "oreStraordinario", "oreFestivo", "oreFerie"].map((campo) => (
                       <div key={campo} className="grid-table__cell py-3 grid-table__cell--center">
                         {isEditing ? (
                           <input
                             type="number"
                             min={0}
                             step={0.5}
                             value={editForm[campo]}
                             onChange={(e) => setEditForm({ ...editForm, [campo]: e.target.value })}
                             className="w-16 text-center border border-slate-300 rounded-md py-1 px-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                           />
                         ) : (
                           <span className={`font-bold ${p[campo] > 0 ? "text-slate-900" : "text-slate-300"}`}>{p[campo] || "-"}</span>
                         )}
                       </div>
                     ))}
                     {(canUpdate || canDelete) && (
                       <div className="grid-table__cell py-3 grid-table__cell--actions">
                         {isEditing ? (
                           <div className="flex justify-end gap-2">
                             <Button onClick={() => setEditingId(null)} variant="ghost" size="sm" className="h-8">Annulla</Button>
                             <Button onClick={handleSaveEdit} size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">Salva</Button>
                           </div>
                         ) : (
                           <div className="flex justify-end gap-2">
                             {canUpdate && <Button onClick={() => startEdit(p)} variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider">Modifica</Button>}
                             {canDelete && <Button onClick={() => handleDelete(p.id)} variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"><Trash2 className="h-4 w-4" /></Button>}
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 );
               })
             )}
           </div>
         </div>
       </div>
     </>
   );
 })()}
 </div>
 </div>
 );
}

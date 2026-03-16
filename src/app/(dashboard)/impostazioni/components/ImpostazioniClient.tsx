"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import "@/components/table/grid-table.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionMatrix, Role, Module, Permission } from "@/lib/permissions";
import { savePermissions } from "../actions";

const modules: Module[] = [
  "Servizi",
  "Field",
  "Fatturazione",
  "Tecnici",
  "Admin",
  "Clienti",
  "Amministratori",
  "Impianti",
  "Contratti",
  "Booking",
  "Manutenzioni",
  "Interventi",
  "VerificheBiennali",
  "Presenze",
  "PresenzeCantiere",
  "Fatture",
  "Archivio",
  "Utenti",
  "Impostazioni",
];

const moduleLabels: Partial<Record<Module, string>> = {
  VerificheBiennali: "Verifiche biennali",
  PresenzeCantiere: "Presenze cantiere",
};
const roles: Role[] = ["ADMIN", "UFFICIO", "TECNICO"];

export function ImpostazioniClient({ initialPermissions }: { initialPermissions: PermissionMatrix }) {
 const [permissions, setPermissions] = useState<PermissionMatrix>(initialPermissions);
 const [isSaving, setIsSaving] = useState(false);

 const handleToggle = (role: string, module: string, perm: Permission) => {
 setPermissions((prev) => {
 // Ensure the module exists in state before trying to toggle it
 const currentRolePerms = prev[role] || {};
 const currentModulePerms = currentRolePerms[module] || { READ: false, CREATE: false, UPDATE: false, DELETE: false };

 return {
 ...prev,
 [role]: {
 ...currentRolePerms,
 [module]: {
 ...currentModulePerms,
 [perm]: !currentModulePerms[perm],
 },
 },
 };
 });
 };

 const handleSave = async () => {
 setIsSaving(true);
 const res = await savePermissions(permissions);
 setIsSaving(false);
 if (res.success) {
 alert("Permessi salvati con successo!");
 window.location.reload(); // Refresh to apply new permissions immediately everywhere
 } else {
 alert(res.error || "Errore durante il salvataggio");
 }
 };

 return (
 <div className="flex flex-col gap-6 w-full p-2">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Impostazioni & Permessi</h1>
 <p className="text-slate-500 font-medium mt-1">Configura gli accessi ai vari moduli</p>
 </div>
 <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 {isSaving ? "SALVATAGGIO..." : "SALVA MODIFICHE"}
 </Button>
 </div>

 <div className="grid grid-cols-1 gap-6">
 {roles.map((role) => (
 <Card key={role} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
 <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
 <CardTitle className="text-xl font-bold uppercase tracking-wider text-slate-800">Ruolo: {role}</CardTitle>
 <CardDescription className="text-slate-500 font-medium">
 Configura i permessi di accesso e modifica per il ruolo {role.toLowerCase()}.
 </CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
  <div
   className="grid-table__head"
   style={{ gridTemplateColumns: "minmax(200px, 1fr) 1fr 1fr 1fr 1fr" }}
   role="row"
  >
   <div className="grid-table__head-cell font-bold text-slate-700 py-4">Modulo</div>
   <div className="grid-table__head-cell font-bold text-slate-700 py-4 grid-table__cell--center">Lettura</div>
   <div className="grid-table__head-cell font-bold text-slate-700 py-4 grid-table__cell--center">Creazione</div>
   <div className="grid-table__head-cell font-bold text-slate-700 py-4 grid-table__cell--center">Modifica</div>
   <div className="grid-table__head-cell font-bold text-slate-700 py-4 grid-table__cell--center">Eliminazione</div>
  </div>
  <div className="grid-table__body">
   {modules.map((module) => {
    const rolePerms = permissions[role]?.[module] || { READ: false, CREATE: false, UPDATE: false, DELETE: false };
    return (
     <div
      key={module}
      className="grid-table__row"
      style={{ gridTemplateColumns: "minmax(200px, 1fr) 1fr 1fr 1fr 1fr" }}
      role="row"
     >
      <div className="grid-table__cell font-semibold text-slate-800 py-4">{moduleLabels[module] ?? module}</div>
      <div className="grid-table__cell py-4 grid-table__cell--center">
       <div className="flex justify-center">
        <Switch
         checked={rolePerms.READ ?? false}
         onCheckedChange={() => handleToggle(role, module, "READ")}
         disabled={role === "ADMIN"}
        />
       </div>
      </div>
      <div className="grid-table__cell py-4 grid-table__cell--center">
       <div className="flex justify-center">
        <Switch
         checked={rolePerms.CREATE ?? false}
         onCheckedChange={() => handleToggle(role, module, "CREATE")}
         disabled={role === "ADMIN" || !rolePerms.READ}
        />
       </div>
      </div>
      <div className="grid-table__cell py-4 grid-table__cell--center">
       <div className="flex justify-center">
        <Switch
         checked={rolePerms.UPDATE ?? false}
         onCheckedChange={() => handleToggle(role, module, "UPDATE")}
         disabled={role === "ADMIN" || !rolePerms.READ}
        />
       </div>
      </div>
      <div className="grid-table__cell py-4 grid-table__cell--center">
       <div className="flex justify-center">
        <Switch
         checked={rolePerms.DELETE ?? false}
         onCheckedChange={() => handleToggle(role, module, "DELETE")}
         disabled={role === "ADMIN" || !rolePerms.READ}
        />
       </div>
      </div>
     </div>
    );
   })}
  </div>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 );
}

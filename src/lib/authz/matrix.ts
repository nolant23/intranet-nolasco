/**
 * Matrice permessi per modulo (allineata a lib/permissions.ts).
 * Usata dal guard per verificare READ/CREATE/UPDATE/DELETE.
 * Per il TECNICO si applica anche ownership (vedi filters.ts).
 */

import type { Permission } from "./constants";
import type { PermissionMatrix } from "@/lib/permissions";
import { getPermissionsForRole } from "@/lib/permissions";

/** Moduli che il TECNICO non deve mai vedere (dati economici o amministrativi) */
const TECNICO_DENY_MODULES: string[] = [
  "Contratti",
  "Fatture",
  "Archivio",
  "Utenti",
  "Impostazioni",
  "Fatturazione",
];

/**
 * Verifica se il ruolo ha il permesso per il modulo.
 * Per TECNICO su moduli in TECNICO_DENY_MODULES restituisce sempre false.
 */
export async function hasModulePermission(
  role: string,
  module: string,
  permission: Permission
): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (role === "TECNICO" && TECNICO_DENY_MODULES.includes(module)) return false;

  const perms = await getPermissionsForRole(role);
  const modulePerms = perms[module as keyof typeof perms];
  if (!modulePerms) return false;

  const value = modulePerms[permission as keyof typeof modulePerms];
  return value === true;
}

/**
 * Verifica permesso e restituisce il modulo per il contesto (es. "Impianti", "Manutenzioni").
 */
export function getModuleForEntity(entity: string): string {
  const map: Record<string, string> = {
    Impianto: "Impianti",
    Manutenzione: "Manutenzioni",
    Intervento: "Interventi",
    VerificaBiennale: "VerificheBiennali",
    Presenza: "Presenze",
    PresenzaCantiere: "PresenzeCantiere",
    Cliente: "Clienti",
    Amministratore: "Amministratori",
    Contratto: "Contratti",
    Fattura: "Fatture",
    NotaCredito: "Fatture",
    Booking: "Booking",
    User: "Utenti",
    RolePermission: "Impostazioni",
  };
  return map[entity] ?? entity;
}

/**
 * Ruoli e entità per il layer di autorizzazione.
 * Deny by default: tutto ciò che non è esplicitamente consentito è vietato.
 */

export const ROLES = ["ADMIN", "UFFICIO", "TECNICO"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ["READ", "CREATE", "UPDATE", "DELETE"] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Entità che hanno ownership (tecnicoId) e sono filtrate per il ruolo TECNICO */
export const OWNERSHIP_ENTITIES = [
  "Manutenzione",
  "Intervento",
  "VerificaBiennale",
  "Presenza",
  "PresenzaCantiere",
] as const;

/** Entità per cui il TECNICO vede solo record "assegnati" (impianti con almeno un rapporto suo) */
export const ASSIGNED_ENTITIES = ["Impianto"] as const;

/** Entità con dati economici: TECNICO non ha mai accesso READ */
export const ECONOMIC_ENTITIES = [
  "Contratto",
  "Fattura",
  "NotaCredito",
  "CondizionePagamento",
  "ServizioContratto",
] as const;

/** Solo ADMIN può accedere */
export const ADMIN_ONLY_ENTITIES = ["User", "RolePermission", "Impostazioni"] as const;

export function isTecnico(role: string): role is "TECNICO" {
  return role === "TECNICO";
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN";
}

export function isUfficio(role: string): boolean {
  return role === "UFFICIO";
}

export function canBypassOwnership(role: string): boolean {
  return role === "ADMIN" || role === "UFFICIO";
}

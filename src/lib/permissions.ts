import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "UFFICIO" | "TECNICO";
export type Permission = "READ" | "CREATE" | "UPDATE" | "DELETE";
export type Module =
  | "Servizi"
  | "Field"
  | "Fatturazione"
  | "Tecnici"
  | "Admin"
  | "Archivio"
  | "Clienti"
  | "Amministratori"
  | "Impianti"
  | "Contratti"
  | "Manutenzioni"
  | "Interventi"
  | "VerificheBiennali"
  | "Presenze"
  | "PresenzeCantiere"
  | "Fatture"
  | "Impostazioni"
  | "Utenti"
  | "Booking";

export interface PermissionMatrix {
  [role: string]: {
    [module: string]: {
      [perm in Permission]: boolean;
    };
  };
}

export const defaultPermissions: PermissionMatrix = {
  ADMIN: {
    Servizi: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Field: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Fatturazione: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Tecnici: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Admin: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Clienti: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Amministratori: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Impianti: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Contratti: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Booking: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Manutenzioni: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Interventi: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    VerificheBiennali: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Presenze: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    PresenzeCantiere: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Fatture: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Archivio: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Utenti: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
    Impostazioni: { READ: true, CREATE: true, UPDATE: true, DELETE: true },
  },
  UFFICIO: {
    Servizi: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Field: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Fatturazione: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Tecnici: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Admin: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Clienti: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Amministratori: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Impianti: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Contratti: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Booking: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Manutenzioni: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Interventi: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    VerificheBiennali: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Presenze: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    PresenzeCantiere: { READ: true, CREATE: true, UPDATE: false, DELETE: false },
    Fatture: { READ: true, CREATE: true, UPDATE: false, DELETE: false },
    Archivio: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Utenti: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Impostazioni: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
  },
  TECNICO: {
    Servizi: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Field: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Fatturazione: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Tecnici: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Admin: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Clienti: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Amministratori: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Impianti: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Contratti: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Booking: { READ: true, CREATE: false, UPDATE: false, DELETE: false },
    Manutenzioni: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    Interventi: { READ: true, CREATE: true, UPDATE: true, DELETE: false },
    VerificheBiennali: { READ: true, CREATE: true, UPDATE: false, DELETE: false },
    Presenze: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    PresenzeCantiere: { READ: true, CREATE: true, UPDATE: false, DELETE: false },
    Fatture: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Archivio: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Utenti: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
    Impostazioni: { READ: false, CREATE: false, UPDATE: false, DELETE: false },
  },
};

async function getPermissionsUncached(): Promise<PermissionMatrix> {
  const dbPermissions = await prisma.rolePermission.findMany();

  const matrix: PermissionMatrix = JSON.parse(JSON.stringify(defaultPermissions)); // deep copy

  if (dbPermissions.length === 0) {
    return matrix;
  }

  for (const row of dbPermissions) {
    // Forza i permessi ADMIN ai valori di default (tutto true) per evitare di rimanere chiusi fuori
    if (row.role === "ADMIN") {
      continue;
    }

    if (matrix[row.role]) {
      try {
        const parsed = JSON.parse(row.permissions);
        // Deep merge per ogni modulo per evitare di sovrascrivere e perdere le nuove chiavi (es. CREATE, UPDATE)
        for (const moduleName of Object.keys(parsed)) {
          if (matrix[row.role][moduleName]) {
            // Retrocompatibilità: se nel db c'è la vecchia chiave "WRITE", la mappiamo su "CREATE" e "UPDATE"
            if (parsed[moduleName].WRITE !== undefined) {
              parsed[moduleName].CREATE = parsed[moduleName].WRITE;
              parsed[moduleName].UPDATE = parsed[moduleName].WRITE;
              delete parsed[moduleName].WRITE;
            }
            matrix[row.role][moduleName] = { ...matrix[row.role][moduleName], ...parsed[moduleName] };
          }
        }
      } catch (e) {
        console.error("Failed to parse permissions for role", row.role);
      }
    }
  }

  return matrix;
}

/** Cache 60 secondi: evita di colpire il DB a ogni richiesta per i permessi. */
export const getPermissions = unstable_cache(
  getPermissionsUncached,
  ["app-permissions"],
  { revalidate: 60 }
);

export async function getPermissionsForRole(role: string) {
  const matrix = await getPermissions();
  return matrix[role] || defaultPermissions.TECNICO; // Fallback
}

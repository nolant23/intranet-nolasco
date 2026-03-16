/**
 * Authorization guard: deny by default, 403 se permesso mancante.
 * Tutte le server actions devono usare questi helper prima di eseguire query.
 */

import { getCurrentUser } from "@/lib/auth";
import { hasModulePermission, getModuleForEntity } from "./matrix";
import type { Permission } from "./constants";
import { canBypassOwnership } from "./constants";

export class ForbiddenError extends Error {
  constructor(message = "Accesso non autorizzato") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AuthzContext = {
  userId: string;
  role: string;
  isTecnico: boolean;
  isAdmin: boolean;
  isUfficio: boolean;
};

/**
 * Restituisce l'utente corrente o lancia (redirect login gestito dal caller).
 * Usare nelle server actions.
 */
export async function getAuthzContext(): Promise<AuthzContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    userId: user.id,
    role: user.role,
    isTecnico: user.role === "TECNICO",
    isAdmin: user.role === "ADMIN",
    isUfficio: user.role === "UFFICIO",
  };
}

/**
 * Richiede che l'utente sia autenticato. Restituisce il contesto o null.
 * Se restituisce null, la action deve restituire { success: false, error: "Non autenticato" } o 403.
 */
export async function requireAuth(): Promise<AuthzContext | null> {
  return getAuthzContext();
}

/**
 * Verifica il permesso per il modulo (es. "Impianti", "Manutenzioni").
 * Se manca, lancia ForbiddenError.
 * La chiamata alle actions deve catturare ForbiddenError e restituire 403.
 */
export async function requirePermission(
  module: string,
  permission: Permission
): Promise<AuthzContext> {
  const ctx = await getAuthzContext();
  if (!ctx) throw new ForbiddenError("Autenticazione richiesta");

  const allowed = await hasModulePermission(ctx.role, module, permission);
  if (!allowed) throw new ForbiddenError(`Permesso mancante: ${module}.${permission}`);

  return ctx;
}

/**
 * Verifica permesso per entità (es. "Impianto" -> modulo "Impianti").
 */
export async function requireEntityPermission(
  entity: string,
  permission: Permission
): Promise<AuthzContext> {
  const module = getModuleForEntity(entity);
  return requirePermission(module, permission);
}

/**
 * Verifica che il record appartenga al tecnico (ownership).
 * Per ADMIN/UFFICIO non fa nulla. Per TECNICO verifica che tecnicoId === ctx.userId.
 */
export function requireOwnership(
  ctx: AuthzContext,
  tecnicoId: string | null | undefined
): void {
  if (canBypassOwnership(ctx.role)) return;
  if (ctx.role === "TECNICO" && tecnicoId !== ctx.userId) {
    throw new ForbiddenError("Accesso negato: record non assegnato al tecnico");
  }
}

/**
 * Helper per le server actions: esegue fn con guard e ritorna 403 in caso di ForbiddenError.
 */
export async function withAuthz<T>(
  fn: (ctx: AuthzContext) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; forbidden?: boolean }> {
  try {
    const ctx = await getAuthzContext();
    if (!ctx) {
      return { success: false, error: "Autenticazione richiesta", forbidden: true };
    }
    const data = await fn(ctx);
    return { success: true, data };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    throw e;
  }
}

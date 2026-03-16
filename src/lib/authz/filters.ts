/**
 * Filtri Prisma per ownership e least privilege.
 * Il tecnico vede solo record assegnati a lui; ADMIN/UFFICIO vedono tutto.
 */

import type { AuthzContext } from "./guard";
import { canBypassOwnership } from "./constants";
import { prisma } from "@/lib/prisma";

/**
 * Restituisce la lista di impianto ID su cui il tecnico ha almeno un rapporto
 * (manutenzione, intervento o verifica biennale) assegnato a lui.
 * Usare per filtrare getImpianti() e getImpiantoDetail().
 */
export async function getImpiantoIdsForTecnico(tecnicoId: string): Promise<string[]> {
  const [man, int, vb] = await Promise.all([
    prisma.manutenzione.findMany({
      where: { tecnicoId },
      select: { impiantoId: true },
      distinct: ["impiantoId"],
    }),
    prisma.intervento.findMany({
      where: { tecnicoId },
      select: { impiantoId: true },
      distinct: ["impiantoId"],
    }),
    prisma.verificaBiennale.findMany({
      where: { tecnicoId: tecnicoId },
      select: { impiantoId: true },
      distinct: ["impiantoId"],
    }),
  ]);

  const set = new Set<string>();
  man.forEach((r) => r.impiantoId && set.add(r.impiantoId));
  int.forEach((r) => r.impiantoId && set.add(r.impiantoId));
  vb.forEach((r) => r.impiantoId && set.add(r.impiantoId));
  return Array.from(set);
}

/**
 * Condizione where per filtrare impianti: se tecnico, solo quelli assegnati.
 */
export async function impiantiWhereForRole(ctx: AuthzContext): Promise<{ id?: { in: string[] } } | undefined> {
  if (canBypassOwnership(ctx.role)) return undefined;
  const ids = await getImpiantoIdsForTecnico(ctx.userId);
  if (ids.length === 0) return { id: { in: [] } }; // nessun impianto -> lista vuota
  return { id: { in: ids } };
}

/**
 * Where per Manutenzione: tecnico solo propri (tecnicoId = userId).
 */
export function manutenzioneWhereForRole(ctx: AuthzContext): { tecnicoId?: string } | undefined {
  if (canBypassOwnership(ctx.role)) return undefined;
  return { tecnicoId: ctx.userId };
}

/**
 * Where per Intervento: tecnico solo propri.
 */
export function interventoWhereForRole(ctx: AuthzContext): { tecnicoId?: string } | undefined {
  if (canBypassOwnership(ctx.role)) return undefined;
  return { tecnicoId: ctx.userId };
}

/**
 * Where per VerificaBiennale: tecnico solo propri.
 */
export function verificaBiennaleWhereForRole(ctx: AuthzContext): { tecnicoId?: string } | undefined {
  if (canBypassOwnership(ctx.role)) return undefined;
  return { tecnicoId: ctx.userId };
}

/**
 * Where per Presenza: tecnico solo propri.
 */
export function presenzaWhereForRole(ctx: AuthzContext): { tecnicoId?: string } | undefined {
  if (canBypassOwnership(ctx.role)) return undefined;
  return { tecnicoId: ctx.userId };
}

/**
 * Where per PresenzaCantiere: tecnico solo propri.
 */
export function presenzaCantiereWhereForRole(ctx: AuthzContext): { tecnicoId?: string } | undefined {
  if (canBypassOwnership(ctx.role)) return undefined;
  return { tecnicoId: ctx.userId };
}

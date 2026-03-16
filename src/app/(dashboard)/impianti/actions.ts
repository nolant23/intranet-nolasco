"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as glide from "@glideapps/tables";
import { resolveComune } from "@/lib/comuni";
import {
  requireEntityPermission,
  ForbiddenError,
  impiantiWhereForRole,
  getImpiantoIdsForTecnico,
} from "@/lib/authz";

const DEFAULT_PAGE_SIZE = 25;

export type GetImpiantiResult =
  | { ok: true; data: Awaited<ReturnType<typeof prisma.impianto.findMany>> }
  | { ok: false; forbidden: true; error: string };

export type GetImpiantiPaginatedResult =
  | { ok: true; data: Awaited<ReturnType<typeof prisma.impianto.findMany>>; total: number }
  | { ok: false; forbidden: true; error: string };

export async function getImpianti(): Promise<GetImpiantiResult> {
  try {
    const ctx = await requireEntityPermission("Impianto", "READ");
    const whereOwnership = await impiantiWhereForRole(ctx);
    const where = whereOwnership ? { AND: [whereOwnership] } : undefined;

    const data = await prisma.impianto.findMany({
      where,
      include: {
        cliente: true,
        amministratore: true,
      },
      orderBy: { numeroImpianto: "asc" },
    });
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { ok: false, forbidden: true, error: e.message };
    }
    throw e;
  }
}

export async function getImpiantiPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  search?: string | null
): Promise<GetImpiantiPaginatedResult> {
  try {
    const ctx = await requireEntityPermission("Impianto", "READ");
    const whereOwnership = await impiantiWhereForRole(ctx);

    const searchTrim = search?.trim();
    const whereSearch = searchTrim
      ? {
          OR: [
            { numeroImpianto: { contains: searchTrim, mode: "insensitive" as const } },
            { indirizzo: { contains: searchTrim, mode: "insensitive" as const } },
            { comune: { contains: searchTrim, mode: "insensitive" as const } },
            { provincia: { contains: searchTrim, mode: "insensitive" as const } },
            { tipologia: { contains: searchTrim, mode: "insensitive" as const } },
            { cliente: { denominazione: { contains: searchTrim, mode: "insensitive" as const } } },
            { amministratore: { denominazione: { contains: searchTrim, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

    const andClauses = [whereOwnership, whereSearch].filter(Boolean) as Prisma.ImpiantoWhereInput[];
    const where = andClauses.length > 0 ? { AND: andClauses } : undefined;

    const skip = (Math.max(1, page) - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.impianto.findMany({
        where,
        include: {
          cliente: true,
          amministratore: true,
        },
        orderBy: { numeroImpianto: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.impianto.count({ where }),
    ]);

    return { ok: true, data, total };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { ok: false, forbidden: true, error: e.message };
    }
    throw e;
  }
}

export type GetImpiantoDetailResult =
  | { success: true; impianto: NonNullable<Awaited<ReturnType<typeof prisma.impianto.findUnique>>> }
  | { success: false; error: string; forbidden?: boolean };

const DETAIL_RELATED_TAKE = 30;

export async function getImpiantoDetail(impiantoId: string): Promise<GetImpiantoDetailResult> {
  try {
    const ctx = await requireEntityPermission("Impianto", "READ");

    if (ctx.role === "TECNICO") {
      const allowedIds = await getImpiantoIdsForTecnico(ctx.userId);
      if (!allowedIds.includes(impiantoId)) {
        return { success: false, error: "Accesso non autorizzato a questo impianto", forbidden: true };
      }
    }

    const [impianto, contratti, interventi, manutenzioni] = await Promise.all([
      prisma.impianto.findUnique({
        where: { id: impiantoId },
        include: {
          cliente: true,
          amministratore: true,
        },
      }),
      prisma.contratto.findMany({
        where: { impiantoId },
        orderBy: { dataEmissione: "desc" },
        take: DETAIL_RELATED_TAKE,
      }),
      prisma.intervento.findMany({
        where: { impiantoId },
        include: { tecnico: { select: { name: true } } },
        orderBy: { dataIntervento: "desc" },
        take: DETAIL_RELATED_TAKE,
      }),
      prisma.manutenzione.findMany({
        where: { impiantoId },
        include: { tecnico: { select: { name: true } } },
        orderBy: { dataManutenzione: "desc" },
        take: DETAIL_RELATED_TAKE,
      }),
    ]);

    if (!impianto) {
      return { success: false, error: "Impianto non trovato" };
    }

    const impiantoWithRelations = {
      ...impianto,
      contratti,
      interventi,
      manutenzioni,
    };
    return { success: true, impianto: impiantoWithRelations };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    console.error("Errore recupero dettaglio impianto:", e);
    return { success: false, error: "Errore durante il recupero del dettaglio impianto" };
  }
}

export async function saveImpianto(data: any): Promise<{ success: true } | { success: false; error: string; forbidden?: boolean }> {
  try {
    const permission = data.id ? "UPDATE" : "CREATE";
    await requireEntityPermission("Impianto", permission);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    throw e;
  }

  try {
    if (data.id) {
      await prisma.impianto.update({
        where: { id: data.id },
        data,
      });
    } else {
      await prisma.impianto.create({
        data,
      });
    }
    revalidatePath("/impianti");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio impianto:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteImpianto(id: string): Promise<{ success: true } | { success: false; error: string; forbidden?: boolean }> {
  try {
    await requireEntityPermission("Impianto", "DELETE");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    throw e;
  }

  try {
    await prisma.impianto.delete({ where: { id } });
    revalidatePath("/impianti");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione impianto:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

export async function fetchImpiantiGlideRows(): Promise<
  { success: true; rows: any[] } | { success: false; error: string; forbidden?: boolean }
> {
  try {
    await requireEntityPermission("Impianto", "CREATE");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: "Accesso non autorizzato", forbidden: true };
    }
    throw e;
  }
  try {
    const token = process.env.GLIDE_TOKEN;
    const app = process.env.GLIDE_APP;
    const table = process.env.GLIDE_TABLE_IMPIANTI;

    if (!token || !app || !table) {
      return {
        success: false,
        error:
          "Credenziali Glide non configurate (GLIDE_TOKEN, GLIDE_APP, GLIDE_TABLE_IMPIANTI in .env)",
      };
    }

    const manParcoImpiantiNolascoTable = glide.table({
      token,
      app,
      table,
      columns: {
        impianto: { type: "string", name: "Name" },
        indirizzo: { type: "string", name: "Indirizzo" },
        comune: { type: "string", name: "Comune" },
        tipologia: { type: "string", name: "Tipologia" },
        modello: { type: "string", name: "Modello" },
        matricola: { type: "string", name: "Matricola" },
        portata: { type: "number", name: "Portata" },
        fermate: { type: "number", name: "Fermate" },
        servizi: { type: "number", name: "Servizi" },
        costruttore: { type: "string", name: "Costruttore" },
        amministratoreIdAmmImp: { type: "string", name: "ID AMM_IMP" },
        clienteIdClienteImp: { type: "string", name: "ID CLIENTE_IMP" },
        clienteIdClienteFic: { type: "string", name: "l3QlL" },
        clienteIdClienteFicNumber: { type: "number", name: "oJAet" },
        numeroDiFabbrica: { type: "string", name: "Numero di fabbrica" },
        installatore: { type: "string", name: "Installatore" },
        naturaVano: { type: "string", name: "Natura Vano" },
        produttoreStruttura: { type: "string", name: "Produttore struttura" },
        testata: { type: "number", name: "Testata" },
        corsa: { type: "number", name: "Corsa" },
        fossa: { type: "number", name: "Fossa" },
        azionamento: { type: "string", name: "Azionamento" },
        alimentazione: { type: "string", name: "Alimentazione" },
        posizioneQuadro: { type: "string", name: "Posizione quadro" },
        funi: { type: "string", name: "Funi" },
        guideCabina: { type: "string", name: "Guide cabina" },
        guideContrappeso: { type: "string", name: "Guide contrappeso" },
        enteNotificato: { type: "string", name: "VuE0j" },
      },
    });

    const rows = await manParcoImpiantiNolascoTable.get();
    return { success: true, rows };
  } catch (error: any) {
    console.error("Errore fetch Glide impianti:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function processaBatchImpiantiGlide(rows: any[]): Promise<
  | { success: true; created: number; skippedExisting: number; skippedNoClient: number; skippedNoRowId: number }
  | { success: false; error: string; forbidden?: boolean }
> {
  try {
    await requireEntityPermission("Impianto", "CREATE");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: "Accesso non autorizzato", forbidden: true };
    }
    throw e;
  }
  try {
    let created = 0;
    let skippedExisting = 0;
    let skippedNoClient = 0;
    let skippedNoRowId = 0;

    for (const r of rows) {
      const glideRowId = r.rowID || r.rowId || r.id || null;

      // Preferire il collegamento tramite clienteIdClienteFicNumber (numero FiC),
      // con fallback al vecchio campo clienteIdClienteFic se necessario.
      const clienteFicIdFromNumber =
        r.clienteIdClienteFicNumber != null
          ? String(r.clienteIdClienteFicNumber)
          : null;
      const clienteFicIdFromString =
        r.clienteIdClienteFic != null ? String(r.clienteIdClienteFic) : null;
      const clienteFicId = clienteFicIdFromNumber ?? clienteFicIdFromString;

      if (!glideRowId) {
        skippedNoRowId++;
        continue;
      }

      if (!clienteFicId) {
        skippedNoClient++;
        continue;
      }

      const existing = await prisma.impianto.findUnique({
        where: { glideRowId: String(glideRowId) },
        select: { id: true },
      });
      if (existing?.id) {
        skippedExisting++;
        continue;
      }

      const cliente = await prisma.cliente.findUnique({
        where: { ficId: clienteFicId },
        select: { id: true },
      });

      if (!cliente?.id) {
        skippedNoClient++;
        continue;
      }

      const data = {
        glideRowId: String(glideRowId),
        glideImpianto: r.impianto || null,
        // Mappatura richiesta: N° Impianto = colonna Glide "Name"
        numeroImpianto: r.impianto || null,
        indirizzo: r.indirizzo || "-",
        comune: r.comune || "-",
        cap: (() => {
          const resolved = resolveComune(r.comune || "");
          return resolved?.cap?.[0] || null;
        })(),
        provincia: (() => {
          const resolved = resolveComune(r.comune || "");
          return resolved?.provincia || null;
        })(),
        tipologia: r.tipologia || null,
        modello: r.modello || null,
        matricola: r.matricola || null,
        portata: r.portata ?? null,
        fermate: r.fermate != null ? Math.trunc(r.fermate) : null,
        servizi: r.servizi != null ? Math.trunc(r.servizi) : null,
        costruttore: r.costruttore || null,
        numeroFabbrica: r.numeroDiFabbrica || null,
        installatore: r.installatore || null,
        naturaVano: r.naturaVano || null,
        produttoreStruttura: r.produttoreStruttura || null,
        testata: r.testata ?? null,
        corsa: r.corsa ?? null,
        fossa: r.fossa ?? null,
        azionamento: r.azionamento || null,
        alimentazione: r.alimentazione || null,
        posizioneQuadro: r.posizioneQuadro || null,
        funi: r.funi || null,
        guideCabina: r.guideCabina || null,
        guideContrappeso: r.guideContrappeso || null,
        enteNotificato: r.enteNotificato || null,

        glideAmministratoreIdAmmImp: r.amministratoreIdAmmImp || null,
        glideClienteIdClienteImp: r.clienteIdClienteImp || null,
        glideClienteIdClienteFic: clienteFicIdFromString,
        glideClienteIdClienteFicNumber:
          r.clienteIdClienteFicNumber != null
            ? Number(r.clienteIdClienteFicNumber)
            : null,

        clienteId: cliente.id,
      };

      await prisma.impianto.create({ data });
      created++;
    }

    revalidatePath("/impianti");
    return {
      success: true,
      created,
      skippedExisting,
      skippedNoClient,
      skippedNoRowId,
    };
  } catch (error: any) {
    console.error("Errore processamento impianti Glide:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

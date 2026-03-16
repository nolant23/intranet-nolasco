"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import { generateRapportinoPDF } from "@/lib/rapportino-pdf/generate";
import { uploadPdfToSupabaseFromLocal } from "@/lib/supabase-storage";
import { sendPushToUser, sendPushToAdminAndUfficio, getNotificationSetting } from "@/app/(dashboard)/notifiche-push/actions";
import {
  requireEntityPermission,
  ForbiddenError,
  requireOwnership,
  manutenzioneWhereForRole,
  getImpiantoIdsForTecnico,
} from "@/lib/authz";

const DEFAULT_PAGE_SIZE = 25;

export async function getManutenzioni() {
  const ctx = await requireEntityPermission("Manutenzione", "READ");
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ownershipWhere = manutenzioneWhereForRole(ctx);
  const where = {
    dataManutenzione: { gte: yearStart },
    ...ownershipWhere,
  };

  return await prisma.manutenzione.findMany({
    where,
    include: {
      impianto: { include: { cliente: true } },
      tecnico: true,
    },
    orderBy: { dataManutenzione: "desc" },
  });
}

export type GetManutenzioniPaginatedResult =
  | { ok: true; data: any[]; total: number }
  | { ok: false; forbidden: true; error: string };

export async function getManutenzioniPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  search?: string | null
): Promise<GetManutenzioniPaginatedResult> {
  try {
    const ctx = await requireEntityPermission("Manutenzione", "READ");
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ownershipWhere = manutenzioneWhereForRole(ctx);
    const where: any = {
      dataManutenzione: { gte: yearStart },
      ...ownershipWhere,
    };
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { impianto: { numeroImpianto: { contains: q, mode: "insensitive" } } },
        { impianto: { indirizzo: { contains: q, mode: "insensitive" } } },
        { impianto: { comune: { contains: q, mode: "insensitive" } } },
        { tecnico: { name: { contains: q, mode: "insensitive" } } },
        { clienteFirmatario: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
      ];
    }
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      prisma.manutenzione.findMany({
        where,
        include: {
          impianto: { include: { cliente: true } },
          tecnico: true,
        },
        orderBy: { dataManutenzione: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.manutenzione.count({ where }),
    ]);
    return { ok: true, data, total };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { ok: false, forbidden: true, error: e.message };
    }
    throw e;
  }
}

export async function getManutenzioneById(id: string): Promise<
  | { success: true; data: any }
  | { success: false; error: string; forbidden?: boolean }
> {
  try {
    const ctx = await requireEntityPermission("Manutenzione", "READ");
    const m = await prisma.manutenzione.findUnique({
      where: { id },
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
    });
    if (!m) return { success: false, error: "Manutenzione non trovata" };
    requireOwnership(ctx, m.tecnicoId);
    return { success: true, data: m };
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    console.error("Errore recupero manutenzione:", e);
    return { success: false, error: "Errore durante il recupero della manutenzione" };
  }
}

const ARCHIVIO_PAGE_SIZE = 80;

export async function getManutenzioniArchivio(
  anno?: number | null,
  comune?: string | null,
  page: number = 1,
  pageSize: number = ARCHIVIO_PAGE_SIZE
) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const where: any = {
    dataManutenzione: anno != null
      ? {
          gte: new Date(anno, 0, 1),
          lte: new Date(anno, 11, 31, 23, 59, 59, 999),
        }
      : { lt: yearStart },
  };
  if (comune && comune.trim() !== "") {
    where.impianto = { comune: comune.trim() };
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.manutenzione.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        impianto: {
          include: { cliente: true },
        },
        tecnico: true,
      },
      orderBy: { dataManutenzione: "desc" },
    }),
    prisma.manutenzione.count({ where }),
  ]);

  return { data, total };
}

/** Filtri archivio: anni e comuni con query leggere (no caricamento di tutte le manutenzioni) */
async function getArchivioFiltersUncached(): Promise<{ anni: number[]; comuni: string[] }> {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [anniRows, comuniRows] = await Promise.all([
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT date_part('year', "dataManutenzione")::int as year
      FROM "Manutenzione"
      WHERE "dataManutenzione" < ${yearStart}
      ORDER BY year DESC
    `,
    prisma.$queryRaw<{ comune: string | null }[]>`
      SELECT DISTINCT i."comune"
      FROM "Impianto" i
      INNER JOIN "Manutenzione" m ON m."impiantoId" = i.id
      WHERE m."dataManutenzione" < ${yearStart}
      ORDER BY i."comune"
    `,
  ]);

  const anni = anniRows.map((r) => r.year);
  const comuni = comuniRows.map((r) => r.comune).filter((c): c is string => Boolean(c));
  return { anni, comuni };
}

export const getArchivioFilters = unstable_cache(
  getArchivioFiltersUncached,
  ["archivio-filters"],
  { revalidate: 120 }
);

export async function getImpiantiDaManutenere() {
  const ctx = await requireEntityPermission("Manutenzione", "CREATE");
  const tecnicoImpiantoIds = ctx.role === "TECNICO" ? await getImpiantoIdsForTecnico(ctx.userId) : null;

  // Logica basata sulle visite annue per anno e periodo (trimestri, quadrimestri, ecc.)
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const msPerDay = 1000 * 60 * 60 * 24;
  // Fine del trimestre corrente: contratti con data inizio CONTRATTO successiva a tale data non vanno in elenco.
  // (dataInizioFatturazione non si usa qui: serve solo per le fatture automatiche periodiche.)
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1; // 1-4
  const lastMonthOfQuarter = currentQuarter * 3; // 3, 6, 9, 12
  const endOfCurrentQuarter = new Date(now.getFullYear(), lastMonthOfQuarter, 0, 23, 59, 59, 999);

  const contratti = await prisma.contratto.findMany({
    where: {
      statoContratto: {
        in: ["Attivo", "ATTIVO"],
      },
      numeroVisiteAnnue: { gt: 0 },
      // Escludi contratti la cui data inizio CONTRATTO è successiva alla fine del trimestre corrente
      OR: [
        { dataContratto: null },
        { dataContratto: { lte: endOfCurrentQuarter } },
      ],
    },
    select: {
      id: true,
      numeroVisiteAnnue: true,
      impianto: {
        select: {
          id: true,
          numeroImpianto: true,
          indirizzo: true,
          comune: true,
          cap: true,
          provincia: true,
          // ci serve solo l'ultima manutenzione (non tutta la lista)
          manutenzioni: {
            orderBy: { dataManutenzione: "desc" },
            take: 1,
            select: { dataManutenzione: true },
          },
          // per i grafici client ci serve anche sapere quante visite annue (cerchiamo il contratto attivo lato client)
          contratti: {
            where: { statoContratto: { in: ["Attivo", "ATTIVO"] } },
            select: { numeroVisiteAnnue: true, statoContratto: true },
          },
        },
      },
    },
  });

  const impiantiDisponibili: any[] = [];

  const getPeriodIndex = (date: Date, visiteAnnue: number) => {
    if (visiteAnnue <= 0) return 0;

    const month = date.getMonth(); // 0-11

    if (12 % visiteAnnue === 0) {
      const stepMonths = 12 / visiteAnnue;
      return Math.floor(month / stepMonths);
    }

    // Fallback per valori non divisori di 12: uso dei giorni nell'anno
    const dayOfYear = Math.floor(
      (date.getTime() - yearStart.getTime()) / msPerDay
    );
    const stepDays = 365 / visiteAnnue;
    return Math.floor(dayOfYear / stepDays);
  };

  for (const contratto of contratti) {
    const impianto = contratto.impianto;
    if (!impianto) continue;

    const visiteAnnue = contratto.numeroVisiteAnnue || 0;
    if (visiteAnnue === 0) continue;

    if (!impianto.manutenzioni || impianto.manutenzioni.length === 0) {
      impiantiDisponibili.push(impianto);
      continue;
    }

    const ultimaManutenzione = impianto.manutenzioni[0];

    // Se l'ultima manutenzione è avvenuta in un anno precedente,
    // consideriamo che per l'anno corrente non sia stata ancora fatta
    // e quindi l'impianto deve rientrare subito nel giro.
    if (ultimaManutenzione.dataManutenzione < yearStart) {
      impiantiDisponibili.push(impianto);
      continue;
    }

    const currentPeriod = getPeriodIndex(now, visiteAnnue);
    const lastPeriod = getPeriodIndex(
      new Date(ultimaManutenzione.dataManutenzione),
      visiteAnnue
    );

    // Se l'ultima manutenzione è stata in un periodo precedente all'attuale,
    // l'impianto torna visibile dall'inizio del nuovo periodo
    if (lastPeriod < currentPeriod) {
      impiantiDisponibili.push(impianto);
    }
  }

  if (tecnicoImpiantoIds !== null) {
    return impiantiDisponibili.filter((i) => tecnicoImpiantoIds.includes(i.id));
  }
  return impiantiDisponibili;
}

export async function getUltimeManutenzioniPerImpianto(impiantoId: string) {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [ultimaManutenzione, ultimaSemestrale] = await Promise.all([
      prisma.manutenzione.findFirst({
        where: { impiantoId },
        orderBy: { dataManutenzione: "desc" },
        include: { tecnico: true },
      }),
      prisma.manutenzione.findFirst({
        where: {
          impiantoId,
          effettuaSemestrale: true,
          dataManutenzione: {
            gte: yearStart,
          },
        },
        orderBy: { dataManutenzione: "desc" },
        include: { tecnico: true },
      }),
    ]);

    return { success: true, ultimaManutenzione, ultimaSemestrale };
  } catch (error) {
    console.error("Errore getUltimeManutenzioniPerImpianto:", error);
    return {
      success: false,
      error: "Errore durante il recupero delle ultime manutenzioni",
    };
  }
}

export async function getTecnici() {
  await requireEntityPermission("Manutenzione", "READ");
  return await prisma.user.findMany({
    where: { role: "TECNICO" },
    orderBy: { name: "asc" },
  });
}

export async function saveManutenzione(data: any): Promise<
  { success: true } | { success: false; error: string; forbidden?: boolean }
> {
  try {
    if (data.id) {
      const ctx = await requireEntityPermission("Manutenzione", "UPDATE");
      const existing = await prisma.manutenzione.findUnique({
        where: { id: data.id },
        select: { tecnicoId: true },
      });
      if (!existing) return { success: false, error: "Manutenzione non trovata" };
      requireOwnership(ctx, existing.tecnicoId);
    } else {
      const ctx = await requireEntityPermission("Manutenzione", "CREATE");
      if (ctx.role === "TECNICO" && data.tecnicoId !== ctx.userId) {
        return { success: false, error: "Il tecnico può creare solo manutenzioni assegnate a sé", forbidden: true };
      }
    }
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    throw e;
  }

  try {
    let savedManutenzione;
    if (data.id) {
      savedManutenzione = await prisma.manutenzione.update({
        where: { id: data.id },
        data: {
          dataManutenzione: new Date(data.dataManutenzione),
          oraEsecuzione: data.oraEsecuzione ?? null,
          tecnicoId: data.tecnicoId,
          impiantoId: data.impiantoId,
          clienteFirmatario: data.clienteFirmatario ?? "",
          firmaTecnico: data.firmaTecnico ?? null,
          firmaCliente: data.firmaCliente ?? null,
          note: data.note != null ? String(data.note).trim() || null : null,
          effettuaSemestrale: data.effettuaSemestrale ?? false,
          efficienzaParacadute: data.efficienzaParacadute ?? null,
          efficienzaLimitatoreVelocita: data.efficienzaLimitatoreVelocita ?? null,
          efficienzaDispositiviSicurezza:
            data.efficienzaDispositiviSicurezza ?? null,
          condizioneFuni: data.condizioneFuni ?? null,
          condizioniAttacchiFuni: data.condizioniAttacchiFuni ?? null,
          condizioneIsolamentoImpianto:
            data.condizioneIsolamentoImpianto ?? null,
          efficienzaCollegamentiTerra:
            data.efficienzaCollegamentiTerra ?? null,
          osservazioniSemestrale: data.osservazioniSemestrale ?? null,
        },
      });
    } else {
      savedManutenzione = await prisma.manutenzione.create({
        data: {
          dataManutenzione: new Date(data.dataManutenzione),
          oraEsecuzione: data.oraEsecuzione ?? null,
          tecnicoId: data.tecnicoId,
          impiantoId: data.impiantoId,
          clienteFirmatario: data.clienteFirmatario ?? "",
          firmaTecnico: data.firmaTecnico ?? null,
          firmaCliente: data.firmaCliente ?? null,
          note: data.note != null ? String(data.note).trim() || null : null,
          effettuaSemestrale: data.effettuaSemestrale ?? false,
          efficienzaParacadute: data.efficienzaParacadute ?? null,
          efficienzaLimitatoreVelocita: data.efficienzaLimitatoreVelocita ?? null,
          efficienzaDispositiviSicurezza:
            data.efficienzaDispositiviSicurezza ?? null,
          condizioneFuni: data.condizioneFuni ?? null,
          condizioniAttacchiFuni: data.condizioniAttacchiFuni ?? null,
          condizioneIsolamentoImpianto:
            data.condizioneIsolamentoImpianto ?? null,
          efficienzaCollegamentiTerra:
            data.efficienzaCollegamentiTerra ?? null,
          osservazioniSemestrale: data.osservazioniSemestrale ?? null,
        },
      });
    }

    // Relazioni necessarie per il PDF (impianto, cliente, tecnico)
    const withRelations = await prisma.manutenzione.findUnique({
      where: { id: savedManutenzione.id },
      include: {
        tecnico: true,
        impianto: { include: { cliente: true, amministratore: true } },
      },
    });

    // Usare i dati APPENA salvati (savedManutenzione) per il PDF, non una rilettura: così note/semestrale sono sempre aggiornate
    const fullForPdf = withRelations
      ? { ...savedManutenzione, tecnico: withRelations.tecnico, impianto: withRelations.impianto }
      : savedManutenzione;

    let finalUrl: string | null = null;
    const pdfPath = await generateRapportinoPDF(fullForPdf);
    if (!pdfPath) {
      console.error("[saveManutenzione] generateRapportinoPDF ha restituito null per manutenzione", savedManutenzione.id);
    } else {
      const objectName = `Rapportino_${savedManutenzione.id}.pdf`;
      const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
      const baseUrl = supabaseUrl ?? pdfPath;
      const ts = Date.now();
      finalUrl = baseUrl.includes("?") ? `${baseUrl}&v=${ts}` : `${baseUrl}?v=${ts}`;
    }

    if (finalUrl) {
      await prisma.manutenzione.update({
        where: { id: savedManutenzione.id },
        data: { rapportinoPdf: finalUrl },
      });
    }

    // Notifiche push quando è una nuova manutenzione (rispetta impostazioni admin)
    if (!data.id && withRelations?.impianto) {
      const setting = await getNotificationSetting("manutenzione.created");
      const imp = withRelations.impianto;
      const label = [imp.numeroImpianto, imp.indirizzo, imp.comune].filter(Boolean).join(" – ") || "Nuova manutenzione";
      const payload = {
        title: "Nuova manutenzione",
        body: label,
        url: `/manutenzioni/${savedManutenzione.id}`,
      };
      if (setting.sendToTecnico && savedManutenzione.tecnicoId) {
        await sendPushToUser(savedManutenzione.tecnicoId, payload);
      }
      if (setting.sendToAdminUfficio) {
        await sendPushToAdminAndUfficio(payload);
      }
    }

    revalidatePath("/manutenzioni");
    revalidatePath("/manutenzioni/archivio");
    revalidatePath("/field");
    revalidatePath("/giro");
    revalidateTag("field-dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio manutenzione:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteManutenzione(id: string): Promise<
  { success: true } | { success: false; error: string; forbidden?: boolean }
> {
  try {
    const ctx = await requireEntityPermission("Manutenzione", "DELETE");
    const existing = await prisma.manutenzione.findUnique({
      where: { id },
      select: { tecnicoId: true },
    });
    if (!existing) return { success: false, error: "Manutenzione non trovata" };
    requireOwnership(ctx, existing.tecnicoId);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return { success: false, error: e.message, forbidden: true };
    }
    throw e;
  }
  try {
    await prisma.manutenzione.delete({ where: { id } });
    revalidatePath("/manutenzioni");
    revalidatePath("/field");
    revalidatePath("/giro");
    revalidateTag("field-dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione manutenzione:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

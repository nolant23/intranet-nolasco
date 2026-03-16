"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as glide from "@glideapps/tables";
import { resolveComune } from "@/lib/comuni";
import { generateEstrattoContoPDF } from "@/lib/pdf";

export async function getAmministratori() {
  return await prisma.amministratore.findMany({
    orderBy: { denominazione: "asc" },
  });
}

const AMMINISTRATORE_IMPIANTI_TAKE = 150;
const AMMINISTRATORE_FATTURE_TAKE = 100;
const AMMINISTRATORE_FATTURE_CODES_MAX = 25;

export async function getAmministratoreDetail(amministratoreId: string) {
  try {
    const amministratore = await prisma.amministratore.findUnique({
      where: { id: amministratoreId },
      include: {
        impianti: {
          include: { cliente: { select: { id: true, denominazione: true } } },
          orderBy: { numeroImpianto: "asc" },
          take: AMMINISTRATORE_IMPIANTI_TAKE,
        },
      },
    });

    if (!amministratore) {
      return { success: false, error: "Amministratore non trovato" };
    }

    const impianti = amministratore.impianti as any[];
    const codes = impianti
      .map((i: any) => String(i?.numeroImpianto || "").trim())
      .filter(Boolean)
      .slice(0, AMMINISTRATORE_FATTURE_CODES_MAX);

    let fatture: any[] = [];

    if (codes.length > 0) {
      const orConditions = codes.flatMap((code: string) => [
        { oggetto: { contains: code, mode: "insensitive" as const } },
        { note: { contains: code, mode: "insensitive" as const } },
      ]);

      fatture = await prisma.fattura.findMany({
        where: { OR: orConditions },
        include: {
          noteCredito: { take: 5 },
          cliente: { select: { id: true, denominazione: true } },
        },
        orderBy: { data: "desc" },
        take: AMMINISTRATORE_FATTURE_TAKE,
      });
    }

    return { success: true, amministratore, fatture };
  } catch (error) {
    console.error("Errore recupero dettaglio amministratore:", error);
    return { success: false, error: "Errore durante il recupero del dettaglio amministratore" };
  }
}

export async function saveAmministratore(data: any) {
  try {
    if (data.id) {
      await prisma.amministratore.update({
        where: { id: data.id },
        data,
      });
    } else {
      await prisma.amministratore.create({
        data,
      });
    }
    revalidatePath("/amministratori");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio amministratore:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteAmministratore(id: string) {
  try {
    await prisma.amministratore.delete({ where: { id } });
    revalidatePath("/amministratori");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione amministratore:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

export async function fetchAmministratoriGlideRows() {
  try {
    const token = process.env.GLIDE_TOKEN;
    const app = process.env.GLIDE_APP;
    const table = process.env.GLIDE_TABLE_AMMINISTRATORI;

    if (!token || !app || !table) {
      return {
        success: false,
        error:
          "Credenziali Glide non configurate (GLIDE_TOKEN, GLIDE_APP, GLIDE_TABLE_AMMINISTRATORI in .env)",
      };
    }

    const manAmministratoriTable = glide.table({
      token,
      app,
      table,
      columns: {
        idAmm: { type: "string", name: "swPoq" },
        amministratore: { type: "string", name: "3q0eU" },
        indirizzo: { type: "string", name: "Indirizzo" },
        telefono: { type: "phone-number", name: "Telefono" },
        cellulare: { type: "phone-number", name: "Cellulare" },
        email: { type: "email-address", name: "Email" },
        pec: { type: "email-address", name: "PEC" },
        codiceSdi: { type: "string", name: "Codice SDI" },
        note: { type: "string", name: "Note" },
        comune: { type: "string", name: "zJTky" },
        printTrigger: { type: "boolean", name: "CPVps" },
        ecUrl: { type: "uri", name: "LTRsU" },
        pdfGlide: { type: "uri", name: "gk3am" },
      },
    });

    const rows = await manAmministratoriTable.get();
    return { success: true, rows };
  } catch (error: any) {
    console.error("Errore fetch Glide amministratori:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function processaBatchAmministratoriGlide(rows: any[]) {
  try {
    let created = 0;
    let skippedExisting = 0;
    let linkedImpianti = 0;
    let skippedNoId = 0;

    for (const r of rows) {
      const glideIdAmm = r.idAmm != null ? String(r.idAmm).trim() : null;
      if (!glideIdAmm) {
        skippedNoId++;
        continue;
      }

      const resolved = resolveComune(r.comune || "");
      const cap = resolved?.cap?.[0] || "";
      const provincia = resolved?.provincia || "";

      const adminData = {
        glideIdAmm,
        denominazione: r.amministratore || "-",
        indirizzo: r.indirizzo || "-",
        comune: r.comune || "-",
        cap: cap || "-",
        provincia: provincia || "-",
        telefono: r.telefono || null,
        cellulare: r.cellulare || null,
        email: r.email || null,
        pec: r.pec || null,
        codiceSdi: r.codiceSdi || null,
        note: r.note || null,
        glidePrintTrigger: r.printTrigger ?? null,
        glideEcUrl: r.ecUrl || null,
        glidePdfGlide: r.pdfGlide || null,
      };

      const existing = await prisma.amministratore.findUnique({
        where: { glideIdAmm },
        select: { id: true },
      });

      let adminId = existing?.id || null;
      if (!adminId) {
        const admin = await prisma.amministratore.create({
          data: adminData,
          select: { id: true },
        });
        adminId = admin.id;
        created++;
      } else {
        skippedExisting++;
      }

      // Collega impianti -> amministratore usando il campo Glide "ID AMM_IMP"
      const resLink = await prisma.impianto.updateMany({
        where: { glideAmministratoreIdAmmImp: glideIdAmm, amministratoreId: null },
        data: { amministratoreId: adminId },
      });
      linkedImpianti += resLink.count;

    }

    revalidatePath("/amministratori");
    revalidatePath("/impianti");
    return { success: true, created, skippedExisting, linkedImpianti, skippedNoId };
  } catch (error: any) {
    console.error("Errore processamento amministratori Glide:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function generaEstrattoConto(amministratoreId: string) {
  try {
    const detail = await getAmministratoreDetail(amministratoreId);
    if (!detail?.success || !detail.amministratore) {
      return { success: false, error: "Amministratore non trovato" };
    }

    const amministratore = detail.amministratore;
    const fatture = (detail as any).fatture || [];
    const impianti = (amministratore as any).impianti || [];

    if (!Array.isArray(fatture) || fatture.length === 0) {
      return { success: false, error: "Nessuna fattura collegata all'amministratore" };
    }

    const url = await generateEstrattoContoPDF(amministratore, fatture, impianti);
    if (!url) {
      return { success: false, error: "Errore durante la generazione dell'estratto conto" };
    }

    return { success: true, url };
  } catch (error: any) {
    console.error("Errore generazione estratto conto:", error);
    return { success: false, error: "Errore durante la generazione dell'estratto conto" };
  }
}

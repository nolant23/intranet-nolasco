"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadBufferToSupabase } from "@/lib/supabase-storage";

const BOOKING_UPLOAD_DIR = "booking";

export async function getBookings() {
  return await prisma.booking.findMany({
    include: {
      clienti: { include: { cliente: true } },
    },
    orderBy: { codiceImpianto: "desc" },
  });
}

export async function getBookingById(id: string) {
  return await prisma.booking.findUnique({
    where: { id },
    include: {
      clienti: { include: { cliente: true } },
      condizioniPagamento: { include: { fattura: true }, orderBy: { ordine: "asc" } },
    },
  });
}

/** Carica un file da FormData (chiave "file") su disco e Supabase. Restituisce l'URL pubblico. */
export async function uploadBookingDocument(formData: FormData): Promise<{ url: string | null; error?: string }> {
  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { url: null };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : "");
    const base = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60) || "doc";
    const safeName = `${Date.now()}-${base}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", BOOKING_UPLOAD_DIR);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);
    const contentType = file.type || "application/octet-stream";
    const supabaseUrl = await uploadBufferToSupabase(buffer, safeName, BOOKING_UPLOAD_DIR, contentType);
    return { url: supabaseUrl || `/uploads/${BOOKING_UPLOAD_DIR}/${safeName}` };
  } catch (e) {
    console.error("Errore upload documento booking:", e);
    return { url: null, error: e instanceof Error ? e.message : "Errore upload" };
  }
}

function parseFloatComma(value: string): number | null {
  if (value == null || value === "") return null;
  const n = parseFloat(String(value).trim().replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

/** Importa condizioni di pagamento da CSV. Colonne: ID CDP, # IMPIANTO, Condizione, Importo, FiC/id fic. Collega a Booking per # IMPIANTO = codiceImpianto e a Fattura per FiC/id fic = ficId. */
export async function importCondizioniPagamentoCsv(csvText: string): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { success: false, imported: 0, skipped: 0, errors: ["File CSV vuoto o senza intestazione"] };
  }
  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let cell = "";
        while (i < line.length && line[i] !== '"') {
          cell += line[i];
          i++;
        }
        if (line[i] === '"') i++;
        out.push(cell.trim());
        if (line[i] === ",") i++;
        continue;
      }
      const comma = line.indexOf(",", i);
      if (comma < 0) {
        out.push(line.slice(i).trim());
        break;
      }
      out.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
    return out;
  }
  const header = parseCsvLine(lines[0].replace(/^#\s*/, ""));
  const idx = (name: string) => header.findIndex((c) => c.includes(name) || c === name);
  const colImpianto = idx("# IMPIANTO") >= 0 ? idx("# IMPIANTO") : header.findIndex((c) => /impianto/i.test(c));
  const colCondizione = idx("Condizione") >= 0 ? idx("Condizione") : 2;
  const colImporto = idx("Importo") >= 0 ? idx("Importo") : 3;
  const colFicId = header.findIndex((c) => /fic|id fic/i.test(c));

  for (let r = 1; r < lines.length; r++) {
    const row = parseCsvLine(lines[r]);
    const codiceImpianto = (colImpianto >= 0 && row[colImpianto] !== undefined ? String(row[colImpianto]).trim() : "").replace(/^["']|["']$/g, "");
    if (!codiceImpianto) {
      skipped++;
      continue;
    }
    const booking = await prisma.booking.findFirst({ where: { codiceImpianto }, select: { id: true } });
    if (!booking) {
      skipped++;
      continue;
    }
    const condizione = colCondizione >= 0 && row[colCondizione] !== undefined ? String(row[colCondizione]).trim() : "";
    if (!condizione) {
      skipped++;
      continue;
    }
    const importoVal = colImporto >= 0 && row[colImporto] !== undefined ? parseFloatComma(String(row[colImporto])) : null;
    const importo = importoVal ?? 0;
    const ficIdRaw = colFicId >= 0 && row[colFicId] !== undefined ? String(row[colFicId]).trim() : "";
    const ficIdFromCsv = ficIdRaw ? String(ficIdRaw).replace(/^["']|["']$/g, "") : null;
    // Usa fatturaFicId solo se esiste una Fattura con quel ficId (evita violazione FK)
    let fatturaFicId: string | null = null;
    if (ficIdFromCsv) {
      const exists = await prisma.fattura.findUnique({
        where: { ficId: ficIdFromCsv },
        select: { ficId: true },
      });
      if (exists) fatturaFicId = ficIdFromCsv;
    }

    const count = await prisma.condizionePagamento.count({ where: { bookingId: booking.id } });
    try {
      await prisma.condizionePagamento.create({
        data: {
          bookingId: booking.id,
          condizione,
          importo,
          importoPagato: 0,
          ordine: count,
          fatturaFicId: fatturaFicId ?? undefined,
        },
      });
      imported++;
    } catch (e) {
      errors.push(`Riga ${r + 1} (${codiceImpianto}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  revalidatePath("/booking");
  revalidatePath("/booking/commesse");
  return { success: errors.length === 0, imported, skipped, errors };
}

/** Restituisce il ficId solo se esiste una Fattura con quel ficId (evita violazione FK). */
async function resolveFatturaFicId(ficId: string | null | undefined): Promise<string | null> {
  const raw = ficId?.trim();
  if (!raw) return null;
  const exists = await prisma.fattura.findUnique({ where: { ficId: raw }, select: { ficId: true } });
  return exists ? raw : null;
}

/** Fatture il cui oggetto contiene il numero impianto e che non sono già collegate ad altre condizioni (o solo a escludiCondizioneId). */
export async function getFattureDisponibiliPerCondizione(
  codiceImpianto: string,
  escludiCondizioneId?: string | null
): Promise<{ ficId: string; numero: string; data: string; oggetto: string }[]> {
  const codice = codiceImpianto?.trim();
  if (!codice) return [];

  const giàCollegate = await prisma.condizionePagamento.findMany({
    where: {
      fatturaFicId: { not: null },
      ...(escludiCondizioneId ? { id: { not: escludiCondizioneId } } : {}),
    },
    select: { fatturaFicId: true },
  });
  const ficIdsUsati = new Set((giàCollegate.map((c) => c.fatturaFicId).filter(Boolean) as string[]));

  const fatture = await prisma.fattura.findMany({
    where: {
      oggetto: { not: null, contains: codice, mode: "insensitive" },
    },
    select: { ficId: true, numero: true, data: true, oggetto: true },
    orderBy: { data: "desc" },
  });

  return fatture
    .filter((f) => !ficIdsUsati.has(f.ficId))
    .map((f) => ({
      ficId: f.ficId,
      numero: f.numero,
      data: f.data.toISOString().split("T")[0],
      oggetto: f.oggetto ?? "",
    }));
}

export async function createCondizionePagamento(data: {
  bookingId: string;
  condizione: string;
  importo: number;
  importoPagato?: number;
  ordine?: number;
  fatturaFicId?: string | null;
}) {
  try {
    const fatturaFicId = await resolveFatturaFicId(data.fatturaFicId);
    const maxOrdine = await prisma.condizionePagamento.findFirst({
      where: { bookingId: data.bookingId },
      orderBy: { ordine: "desc" },
      select: { ordine: true },
    });
    await prisma.condizionePagamento.create({
      data: {
        bookingId: data.bookingId,
        condizione: data.condizione.trim(),
        importo: data.importo,
        importoPagato: data.importoPagato ?? 0,
        ordine: data.ordine ?? (maxOrdine?.ordine ?? 0) + 1,
        fatturaFicId: fatturaFicId ?? undefined,
      },
    });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    revalidatePath(`/booking/${data.bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("Errore creazione condizione pagamento:", error);
    return { success: false, error: "Errore durante la creazione" };
  }
}

export async function updateCondizionePagamento(
  id: string,
  data: { condizione?: string; importo?: number; importoPagato?: number; ordine?: number; fatturaFicId?: string | null }
) {
  try {
    const cp = await prisma.condizionePagamento.findUnique({ where: { id }, select: { bookingId: true } });
    if (!cp) return { success: false, error: "Non trovato" };
    const updateData: { condizione?: string; importo?: number; importoPagato?: number; ordine?: number; fatturaFicId?: string | null } = {
      ...(data.condizione !== undefined && { condizione: data.condizione.trim() }),
      ...(data.importo !== undefined && { importo: data.importo }),
      ...(data.importoPagato !== undefined && { importoPagato: data.importoPagato }),
      ...(data.ordine !== undefined && { ordine: data.ordine }),
    };
    if (data.fatturaFicId !== undefined) {
      updateData.fatturaFicId = await resolveFatturaFicId(data.fatturaFicId);
    }
    await prisma.condizionePagamento.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    revalidatePath(`/booking/${cp.bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("Errore aggiornamento condizione pagamento:", error);
    return { success: false, error: "Errore durante l'aggiornamento" };
  }
}

export async function deleteCondizionePagamento(id: string) {
  try {
    const cp = await prisma.condizionePagamento.findUnique({ where: { id }, select: { bookingId: true } });
    if (!cp) return { success: false, error: "Non trovato" };
    await prisma.condizionePagamento.delete({ where: { id } });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    revalidatePath(`/booking/${cp.bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione condizione pagamento:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

function parseDate(value: string): Date | null {
  if (!value || !value.trim()) return null;
  // CSV format: "06/05/2021, 0:00:00" or "19/06/2023, 0:00:00"
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return isNaN(d.getTime()) ? null : d;
}

function parseFloatSafe(value: string): number | null {
  if (value == null || value === "") return null;
  const n = parseFloat(String(value).replace(",", ".").trim());
  return Number.isNaN(n) ? null : n;
}

/** Colonna CLIENTE/ID Cliente DEF: può contenere uno o più ID (ficId) separati da virgola. Restituisce array di ficId. */
function parseClienteFicIds(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export async function importBookingCsv(csvText: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { success: false, imported: 0, errors: ["File CSV vuoto o senza intestazione"] };
  }
  /** Parse una riga CSV rispettando campi tra virgolette. */
  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let cell = "";
        while (i < line.length && line[i] !== '"') {
          cell += line[i];
          i++;
        }
        if (line[i] === '"') i++;
        out.push(cell.trim());
        if (line[i] === ",") i++;
        continue;
      }
      const comma = line.indexOf(",", i);
      if (comma < 0) {
        out.push(line.slice(i).trim());
        break;
      }
      out.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
    return out;
  }
  const headerCols = parseCsvLine(lines[0].replace(/^#\s*/, ""));
  const idx = (name: string) => {
    const i = headerCols.findIndex((c) => c.includes(name) || c === name);
    return i >= 0 ? i : -1;
  };
  const get = (row: string[], name: string): string => {
    const i = idx(name);
    if (i < 0) return "";
    const cell = row[i];
    return cell != null ? String(cell).trim() : "";
  };

  // Indici colonne (nomi come nel CSV)
  const col = {
    impianto: idx("Impianto"),
    indirizzo: idx("Indirizzo Impianto"),
    comune: idx("COMUNE/Comune Impianto"),
    provincia: idx("COMUNE/Provincia"),
    cap: idx("COMUNE/CAP"),
    dataContratto: idx("Data Contratto"),
    clienteFicIds: idx("CLIENTE/ID Cliente DEF"),
    tipologia: idx("Tipologia Impianto"),
    modello: idx("Modello Impianto"),
    statoMateriali: idx("Stato Materiali"),
    montaggio: idx("Montaggio"),
    contrattoFirmato: idx("Contratto firmato"),
    disegnoDefinitivo: idx("Disegno definitivo"),
    inizioMontaggio: idx("Inizio Montaggio"),
    fineMontaggio: idx("Fine Montaggio"),
    statoMontaggio: idx("Stato montaggio"),
    enteNotificato: idx("UE/Ente Notificato"),
    nIdentificazioneEnte: idx("UE/N. identificazione Ente"),
    nAttestato: idx("UE/N. Attestato"),
    dm37: idx("DM37"),
    progettazione: idx("Progettazione"),
  };

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const row = parseCsvLine(line);
    if (row.length < 2) continue;

    const getVal = (i: number) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : "");
    const codiceImpianto = getVal(col.impianto);
    if (!codiceImpianto) continue;

    const dataContratto = parseDate(getVal(col.dataContratto));
    const clienteFicIdsRaw = getVal(col.clienteFicIds);
    const ficIds = parseClienteFicIds(clienteFicIdsRaw);

    const montaggio = parseFloatSafe(getVal(col.montaggio));
    const progettazione = parseFloatSafe(getVal(col.progettazione));
    const inizioMontaggio = parseDate(getVal(col.inizioMontaggio));
    const fineMontaggio = parseDate(getVal(col.fineMontaggio));

    try {
      const booking = await prisma.booking.create({
        data: {
          codiceImpianto,
          indirizzoImpianto: getVal(col.indirizzo) || null,
          comuneImpianto: getVal(col.comune) || null,
          provinciaImpianto: getVal(col.provincia) || null,
          capImpianto: getVal(col.cap) || null,
          dataContratto: dataContratto ?? undefined,
          tipologiaImpianto: getVal(col.tipologia) || null,
          modelloImpianto: getVal(col.modello) || null,
          statoMateriali: getVal(col.statoMateriali) || null,
          montaggio: montaggio ?? undefined,
          contrattoFirmatoUrl: getVal(col.contrattoFirmato) || null,
          disegnoDefinitivoUrl: getVal(col.disegnoDefinitivo) || null,
          inizioMontaggio: inizioMontaggio ?? undefined,
          fineMontaggio: fineMontaggio ?? undefined,
          statoMontaggio: getVal(col.statoMontaggio) || null,
          enteNotificato: getVal(col.enteNotificato) || null,
          nIdentificazioneEnte: getVal(col.nIdentificazioneEnte) || null,
          nAttestato: getVal(col.nAttestato) || null,
          dm37Url: getVal(col.dm37) || null,
          progettazione: progettazione ?? undefined,
        },
      });

      for (const ficId of ficIds) {
        const cliente = await prisma.cliente.findUnique({ where: { ficId }, select: { id: true } });
        if (cliente) {
          await prisma.bookingCliente.create({
            data: { bookingId: booking.id, clienteId: cliente.id },
          });
        }
      }
      imported++;
    } catch (e) {
      errors.push(`Riga ${r + 1} (${codiceImpianto}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  revalidatePath("/booking");
  revalidatePath("/booking/commesse");
  return { success: errors.length === 0, imported, errors };
}

export async function createBooking(data: {
  codiceImpianto: string;
  indirizzoImpianto?: string | null;
  comuneImpianto?: string | null;
  provinciaImpianto?: string | null;
  capImpianto?: string | null;
  dataContratto?: Date | null;
  tipologiaImpianto?: string | null;
  modelloImpianto?: string | null;
  statoMateriali?: string | null;
  montaggio?: number | null;
  statoMontaggio?: string | null;
  inizioMontaggio?: Date | null;
  fineMontaggio?: Date | null;
  progettazione?: number | null;
  enteNotificato?: string | null;
  nIdentificazioneEnte?: string | null;
  nAttestato?: string | null;
  contrattoFirmatoUrl?: string | null;
  disegnoDefinitivoUrl?: string | null;
  dm37Url?: string | null;
}) {
  try {
    const booking = await prisma.booking.create({
      data: {
        codiceImpianto: data.codiceImpianto.trim(),
        indirizzoImpianto: data.indirizzoImpianto?.trim() || null,
        comuneImpianto: data.comuneImpianto?.trim() || null,
        provinciaImpianto: data.provinciaImpianto?.trim() || null,
        capImpianto: data.capImpianto?.trim() || null,
        dataContratto: data.dataContratto ?? undefined,
        tipologiaImpianto: data.tipologiaImpianto?.trim() || null,
        modelloImpianto: data.modelloImpianto?.trim() || null,
        statoMateriali: data.statoMateriali?.trim() || null,
        montaggio: data.montaggio ?? undefined,
        statoMontaggio: data.statoMontaggio?.trim() || null,
        inizioMontaggio: data.inizioMontaggio ?? undefined,
        fineMontaggio: data.fineMontaggio ?? undefined,
        progettazione: data.progettazione ?? undefined,
        enteNotificato: data.enteNotificato?.trim() || null,
        nIdentificazioneEnte: data.nIdentificazioneEnte?.trim() || null,
        nAttestato: data.nAttestato?.trim() || null,
        contrattoFirmatoUrl: data.contrattoFirmatoUrl?.trim() || null,
        disegnoDefinitivoUrl: data.disegnoDefinitivoUrl?.trim() || null,
        dm37Url: data.dm37Url?.trim() || null,
      },
    });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    return { success: true, id: booking.id };
  } catch (error) {
    console.error("Errore creazione booking:", error);
    return { success: false, error: "Errore durante la creazione" };
  }
}

export async function updateBooking(
  id: string,
  data: {
    codiceImpianto?: string;
    indirizzoImpianto?: string | null;
    comuneImpianto?: string | null;
    provinciaImpianto?: string | null;
    capImpianto?: string | null;
    dataContratto?: Date | null;
    tipologiaImpianto?: string | null;
    modelloImpianto?: string | null;
    statoMateriali?: string | null;
    montaggio?: number | null;
    statoMontaggio?: string | null;
    inizioMontaggio?: Date | null;
    fineMontaggio?: Date | null;
    progettazione?: number | null;
    enteNotificato?: string | null;
    nIdentificazioneEnte?: string | null;
    nAttestato?: string | null;
    contrattoFirmatoUrl?: string | null;
    disegnoDefinitivoUrl?: string | null;
    dm37Url?: string | null;
  }
) {
  try {
    await prisma.booking.update({
      where: { id },
      data: {
        ...(data.codiceImpianto !== undefined && { codiceImpianto: data.codiceImpianto.trim() }),
        ...(data.indirizzoImpianto !== undefined && { indirizzoImpianto: data.indirizzoImpianto?.trim() || null }),
        ...(data.comuneImpianto !== undefined && { comuneImpianto: data.comuneImpianto?.trim() || null }),
        ...(data.provinciaImpianto !== undefined && { provinciaImpianto: data.provinciaImpianto?.trim() || null }),
        ...(data.capImpianto !== undefined && { capImpianto: data.capImpianto?.trim() || null }),
        ...(data.dataContratto !== undefined && { dataContratto: data.dataContratto ?? null }),
        ...(data.tipologiaImpianto !== undefined && { tipologiaImpianto: data.tipologiaImpianto?.trim() || null }),
        ...(data.modelloImpianto !== undefined && { modelloImpianto: data.modelloImpianto?.trim() || null }),
        ...(data.statoMateriali !== undefined && { statoMateriali: data.statoMateriali?.trim() || null }),
        ...(data.montaggio !== undefined && { montaggio: data.montaggio ?? null }),
        ...(data.statoMontaggio !== undefined && { statoMontaggio: data.statoMontaggio?.trim() || null }),
        ...(data.inizioMontaggio !== undefined && { inizioMontaggio: data.inizioMontaggio ?? null }),
        ...(data.fineMontaggio !== undefined && { fineMontaggio: data.fineMontaggio ?? null }),
        ...(data.progettazione !== undefined && { progettazione: data.progettazione ?? null }),
        ...(data.enteNotificato !== undefined && { enteNotificato: data.enteNotificato?.trim() || null }),
        ...(data.nIdentificazioneEnte !== undefined && { nIdentificazioneEnte: data.nIdentificazioneEnte?.trim() || null }),
        ...(data.nAttestato !== undefined && { nAttestato: data.nAttestato?.trim() || null }),
        ...(data.contrattoFirmatoUrl !== undefined && { contrattoFirmatoUrl: data.contrattoFirmatoUrl?.trim() || null }),
        ...(data.disegnoDefinitivoUrl !== undefined && { disegnoDefinitivoUrl: data.disegnoDefinitivoUrl?.trim() || null }),
        ...(data.dm37Url !== undefined && { dm37Url: data.dm37Url?.trim() || null }),
      },
    });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    revalidatePath(`/booking/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Errore aggiornamento booking:", error);
    return { success: false, error: "Errore durante l'aggiornamento" };
  }
}

export async function deleteBooking(id: string) {
  try {
    await prisma.booking.delete({ where: { id } });
    revalidatePath("/booking");
    revalidatePath("/booking/commesse");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione booking:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

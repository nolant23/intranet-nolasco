"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

const STATO_IN_CORSO = "In Corso";

export type PresenzaCantiereWithRelations = Awaited<
  ReturnType<typeof getPresenzeCantiere>
>[number];

/** Booking con stato montaggio "In Corso" per la select impianto (solo questi). */
export async function getBookingsInCorso() {
  return prisma.booking.findMany({
    where: { statoMontaggio: STATO_IN_CORSO },
    orderBy: [{ codiceImpianto: "asc" }],
    select: {
      id: true,
      codiceImpianto: true,
      indirizzoImpianto: true,
      comuneImpianto: true,
    },
  });
}

/** Lista presenze cantiere: i tecnici vedono solo le proprie, gli altri ruoli tutte. */
export async function getPresenzeCantiere() {
  const user = await getCurrentUser();
  const list = await prisma.presenzaCantiere.findMany({
    where: user?.role === "TECNICO" ? { tecnicoId: user.id } : undefined,
    include: {
      booking: { select: { id: true, codiceImpianto: true, indirizzoImpianto: true, comuneImpianto: true } },
      tecnico: { select: { id: true, name: true } },
    },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
  });
  return list;
}

/** Dettaglio singola presenza cantiere. I tecnici solo le proprie. */
export async function getPresenzaCantiereById(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const where: { id: string; tecnicoId?: string } = { id };
  if (user.role === "TECNICO") where.tecnicoId = user.id;
  return prisma.presenzaCantiere.findFirst({
    where,
    include: {
      booking: { select: { id: true, codiceImpianto: true, indirizzoImpianto: true, comuneImpianto: true } },
      tecnico: { select: { id: true, name: true } },
    },
  });
}

export type CreatePresenzaCantiereInput = {
  data: string; // ISO date o datetime
  oreCantiere: number;
  descrizione?: string | null;
  bookingId: string;
  tecnicoId: string;
};

export async function createPresenzaCantiere(input: CreatePresenzaCantiereInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");

  const dataDate = new Date(input.data);
  if (isNaN(dataDate.getTime())) throw new Error("Data non valida");

  await prisma.presenzaCantiere.create({
    data: {
      data: dataDate,
      oreCantiere: Number(input.oreCantiere),
      descrizione: input.descrizione?.trim() || null,
      bookingId: input.bookingId,
      tecnicoId: input.tecnicoId,
    },
  });

  revalidatePath("/tecnici");
  revalidatePath("/tecnici/presenze-cantiere");
  revalidatePath("/tecnici/presenze/presenze-cantiere");
  revalidatePath("/tecnici/presenze-cantiere/nuova");
  revalidatePath("/booking");
}

/** Parses CSV with quoted fields (commas and newlines allowed inside quotes). */
function parseCSV(csvText: string): Record<string, string>[] {
  const rows: { values: string[] }[] = [];
  let headers: string[] = [];
  let currentRow: string[] = [];
  let current = "";
  let inQuotes = false;
  const pushRow = () => {
    if (currentRow.length > 0 || current.trim()) {
      currentRow.push(current.trim());
      if (!headers.length) {
        headers = currentRow.map((h) => h.replace(/^"|"$/g, "").trim());
      } else if (currentRow.some((v) => v)) {
        rows.push({ values: currentRow });
      }
      currentRow = [];
      current = "";
    }
  };
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) {
      current += c;
      continue;
    }
    if (c === ",") {
      currentRow.push(current.trim());
      current = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && csvText[i + 1] === "\n") i++;
      pushRow();
      continue;
    }
    current += c;
  }
  if (current.length || currentRow.length) {
    currentRow.push(current.trim());
    if (!headers.length) headers = currentRow.map((h) => h.replace(/^"|"$/g, "").trim());
    else if (currentRow.some((v) => v)) rows.push({ values: currentRow });
  }
  return rows.map((r) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (r.values[idx] ?? "").replace(/^"|"$/g, "").trim();
    });
    return row;
  });
}

/** Parses DATA field: "21/03/2022, 12:00:00" or "21/03/2022" -> Date. */
function parseDataField(s: string): Date | null {
  const trimmed = (s || "").trim().replace(/^"|"$/g, "");
  const [datePart, timePart] = trimmed.split(",").map((x) => x.trim());
  if (!datePart) return null;
  const [d, m, y] = datePart.split("/").map((x) => parseInt(x, 10));
  if (!d || !m || !y) return null;
  let h = 0,
    min = 0,
    sec = 0;
  if (timePart) {
    const [hh, mm, ss] = timePart.split(":").map((x) => parseInt(x, 10) || 0);
    h = hh ?? 0;
    min = mm ?? 0;
    sec = ss ?? 0;
  }
  const date = new Date(y, m - 1, d, h, min, sec);
  return isNaN(date.getTime()) ? null : date;
}

export type ImportPresenzeCantiereResult = {
  created: number;
  skipped: number;
  errors: string[];
};

/** Import presenze cantiere from CSV. Columns: DATA, Tecnico, ORE CANTIERE, DESCRIZIONE, IMPIANTO. */
export async function importPresenzeCantiereFromCsv(
  csvText: string
): Promise<ImportPresenzeCantiereResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");

  const result: ImportPresenzeCantiereResult = { created: 0, skipped: 0, errors: [] };
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    result.errors.push("Nessuna riga dati trovata nel CSV (verificare intestazioni: DATA, Tecnico, ORE CANTIERE, DESCRIZIONE, IMPIANTO).");
    return result;
  }

  const allBookings = await prisma.booking.findMany({
    select: { id: true, codiceImpianto: true },
  });
  const bookingByCodice = new Map<string, string>();
  allBookings.forEach((b) => {
    if (b.codiceImpianto) bookingByCodice.set(b.codiceImpianto.trim(), b.id);
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  const userByName = new Map<string, string>();
  allUsers.forEach((u) => {
    if (u.name) userByName.set(u.name.trim(), u.id);
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawData = row["DATA"] ?? row["data"] ?? "";
    const rawTecnico = (row["Tecnico"] ?? row["tecnico"] ?? "").trim();
    const rawOre = (row["ORE CANTIERE"] ?? row["ore cantiere"] ?? "").trim();
    const descrizione = (row["DESCRIZIONE"] ?? row["descrizione"] ?? "").trim() || null;
    const rawImpianto = (row["IMPIANTO"] ?? row["impianto"] ?? "").trim();

    const data = parseDataField(rawData);
    if (!data) {
      result.errors.push(`Riga ${i + 2}: data non valida "${rawData}"`);
      result.skipped++;
      continue;
    }
    const ore = parseFloat(rawOre.replace(",", "."));
    if (isNaN(ore) || ore < 0) {
      result.errors.push(`Riga ${i + 2}: ore cantiere non valide "${rawOre}"`);
      result.skipped++;
      continue;
    }
    const bookingId = rawImpianto ? bookingByCodice.get(rawImpianto) : undefined;
    if (!bookingId) {
      result.errors.push(`Riga ${i + 2}: impianto "${rawImpianto}" non trovato (codice impianto)`);
      result.skipped++;
      continue;
    }
    const tecnicoId = rawTecnico ? userByName.get(rawTecnico) : undefined;
    if (!tecnicoId) {
      result.errors.push(`Riga ${i + 2}: tecnico "${rawTecnico}" non trovato (nome utente)`);
      result.skipped++;
      continue;
    }

    try {
      await prisma.presenzaCantiere.create({
        data: {
          data,
          oreCantiere: ore,
          descrizione,
          bookingId,
          tecnicoId,
        },
      });
      result.created++;
    } catch (e) {
      result.errors.push(
        `Riga ${i + 2}: ${e instanceof Error ? e.message : "Errore creazione"}`
      );
      result.skipped++;
    }
  }

  revalidatePath("/tecnici/presenze-cantiere");
  revalidatePath("/tecnici/presenze/presenze-cantiere");
  revalidatePath("/booking");
  return result;
}

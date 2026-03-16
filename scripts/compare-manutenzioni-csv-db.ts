/**
 * Confronta le manutenzioni del CSV MAN_ELENCO MANUTENZIONI con quelle nel DB
 * e stampa quali righe CSV non hanno un corrispettivo in DB (e il motivo).
 *
 * Eseguire dalla root: npx tsx scripts/compare-manutenzioni-csv-db.ts "/path/to/MAN_ELENCO MANUTENZIONI.csv"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseDateIt(d: string): string | null {
  if (!d || !d.trim()) return null;
  const m = d.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, day, month, year] = m;
  return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
}

/** Estrae la data da "DATA CARICAMENTO" (es. "28/03/2023, 8:43:43") per usarla quando "giorno" è vuoto */
function parseDateFromDataCaricamento(dataCaricamento: string): string | null {
  if (!dataCaricamento || !dataCaricamento.trim()) return null;
  const part = dataCaricamento.trim().split(",")[0]?.trim();
  return part ? parseDateIt(part) : null;
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), "MAN_ELENCO MANUTENZIONI.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("File CSV non trovato:", csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const giornoIdx = header.findIndex((h) => h.toLowerCase() === "giorno");
  const impiantoIdx = header.findIndex((h) => h.toLowerCase() === "impianto");
  const tecnicoIdx = header.findIndex((h) => h.toLowerCase() === "tecnico");
  const idIdx = header.findIndex((h) => h.toLowerCase().includes("id manutenzione"));
  const dataCaricamentoIdx = header.findIndex((h) => h.toLowerCase().includes("data caricamento"));

  if (giornoIdx < 0 || impiantoIdx < 0 || tecnicoIdx < 0) {
    console.error("Colonne obbligatorie non trovate (Impianto, Tecnico, giorno). Header:", header);
    process.exit(1);
  }

  const csvRows: { glideId: string; impianto: string; tecnico: string; giorno: string; dateKey: string | null; rowNum: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const impianto = (cols[impiantoIdx] ?? "").trim();
    const tecnico = (cols[tecnicoIdx] ?? "").trim();
    const giorno = (cols[giornoIdx] ?? "").trim();
    const glideId = idIdx >= 0 ? (cols[idIdx] ?? "").trim() : "";
    let dateKey = parseDateIt(giorno);
    if (!dateKey && dataCaricamentoIdx >= 0) {
      dateKey = parseDateFromDataCaricamento(cols[dataCaricamentoIdx] ?? "");
    }
    if (impianto && tecnico) {
      csvRows.push({
        glideId,
        impianto,
        tecnico,
        giorno: giorno || (dataCaricamentoIdx >= 0 ? (cols[dataCaricamentoIdx] ?? "").trim() : "") || "",
        dateKey,
        rowNum: i + 1,
      });
    }
  }

  const dbManutenzioni = await prisma.manutenzione.findMany({
    select: {
      id: true,
      glideId: true,
      dataManutenzione: true,
      impianto: { select: { numeroImpianto: true } },
      tecnico: { select: { name: true } },
    },
  });

  const dbGlideIds = new Set(
    dbManutenzioni.map((m) => m.glideId).filter((g): g is string => !!g?.trim())
  );

  const dbKeys: { key: string; used: boolean }[] = dbManutenzioni
    .filter((m) => !m.glideId)
    .map((m) => {
      const d = new Date(m.dataManutenzione);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const imp = (m.impianto?.numeroImpianto ?? "").trim();
      const tec = (m.tecnico?.name ?? "").trim();
      return { key: `${imp}|${tec}|${dateKey}`, used: false };
    });

  const impiantiNumeri = new Set(await prisma.impianto.findMany({ select: { numeroImpianto: true } }).then((r) => r.map((i) => (i.numeroImpianto ?? "").trim())));
  const tecniciNomi = new Set(
    await prisma.user.findMany({ where: { role: "TECNICO" }, select: { name: true } }).then((r) => r.map((u) => u.name.trim()))
  );

  const missing: { rowNum: number; glideId: string; impianto: string; tecnico: string; giorno: string; motivo: string }[] = [];

  for (const row of csvRows) {
    if (row.glideId && dbGlideIds.has(row.glideId)) {
      continue;
    }
    if (row.glideId && !dbGlideIds.has(row.glideId)) {
      if (!impiantiNumeri.has(row.impianto)) {
        missing.push({ rowNum: row.rowNum, glideId: row.glideId, impianto: row.impianto, tecnico: row.tecnico, giorno: row.giorno, motivo: "Impianto non presente in DB" });
        continue;
      }
      if (!tecniciNomi.has(row.tecnico)) {
        missing.push({ rowNum: row.rowNum, glideId: row.glideId, impianto: row.impianto, tecnico: row.tecnico, giorno: row.giorno, motivo: "Tecnico non presente in DB (o non con ruolo TECNICO)" });
        continue;
      }
      missing.push({
        rowNum: row.rowNum,
        glideId: row.glideId,
        impianto: row.impianto,
        tecnico: row.tecnico,
        giorno: row.giorno,
        motivo: "glideId non presente in DB (da importare)",
      });
      continue;
    }
    if (!row.dateKey) {
      missing.push({
        rowNum: row.rowNum,
        glideId: row.glideId,
        impianto: row.impianto,
        tecnico: row.tecnico,
        giorno: row.giorno,
        motivo: "Data (giorno) non valida o vuota e nessun glideId",
      });
      continue;
    }
    if (!impiantiNumeri.has(row.impianto)) {
      missing.push({
        rowNum: row.rowNum,
        glideId: row.glideId,
        impianto: row.impianto,
        tecnico: row.tecnico,
        giorno: row.giorno,
        motivo: "Impianto non presente in DB",
      });
      continue;
    }
    if (!tecniciNomi.has(row.tecnico)) {
      missing.push({
        rowNum: row.rowNum,
        glideId: row.glideId,
        impianto: row.impianto,
        tecnico: row.tecnico,
        giorno: row.giorno,
        motivo: "Tecnico non presente in DB (o non con ruolo TECNICO)",
      });
      continue;
    }
    const key = `${row.impianto}|${row.tecnico}|${row.dateKey}`;
    const idx = dbKeys.findIndex((k) => !k.used && k.key === key);
    if (idx < 0) {
      missing.push({
        rowNum: row.rowNum,
        glideId: row.glideId,
        impianto: row.impianto,
        tecnico: row.tecnico,
        giorno: row.giorno,
        motivo: "Nessun record in DB con stesso Impianto + Tecnico + Data (nessun glideId per match univoco)",
      });
      continue;
    }
    dbKeys[idx].used = true;
  }

  console.log("\n--- Riepilogo ---");
  console.log("Righe CSV (esclusa intestazione):", csvRows.length);
  console.log("Manutenzioni in DB:", dbManutenzioni.length);
  console.log("Differenza:", csvRows.length - dbManutenzioni.length);
  console.log("\n--- Righe CSV senza corrispettivo in DB ---\n");
  if (missing.length === 0) {
    console.log("Nessuna: ogni riga CSV ha un match in DB (il conteggio diverso può dipendere da duplicati in CSV o record in DB non presenti nel CSV).");
  } else {
    for (const m of missing) {
      console.log(`Riga CSV ${m.rowNum} | id Glide: ${m.glideId || "-"} | Impianto: ${m.impianto} | Tecnico: ${m.tecnico} | giorno: ${m.giorno}`);
      console.log(`  → Motivo: ${m.motivo}\n`);
    }
  }
  console.log("Fine.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

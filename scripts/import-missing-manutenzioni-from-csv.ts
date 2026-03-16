/**
 * Importa le manutenzioni "mancanti" dal CSV (righe senza corrispettivo in DB).
 * Usa "DATA CARICAMENTO" quando "giorno" è vuoto.
 *
 * Eseguire dalla root: npx tsx scripts/import-missing-manutenzioni-from-csv.ts "/path/to/MAN_ELENCO MANUTENZIONI.csv"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { urlToBase64DataUrl } from "../src/lib/signature-utils";
import { generateRapportinoPDF } from "../src/lib/rapportino-pdf/generate";
import { uploadPdfToSupabaseFromLocal } from "../src/lib/supabase-storage";

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
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

function parseDateFromDataCaricamento(dataCaricamento: string): { dateKey: string; ora?: string } | null {
  if (!dataCaricamento || !dataCaricamento.trim()) return null;
  const parts = dataCaricamento.trim().split(",").map((p) => p.trim());
  const datePart = parts[0];
  const timePart = parts[1];
  const dateKey = datePart ? parseDateIt(datePart) : null;
  if (!dateKey) return null;
  return { dateKey, ora: timePart || undefined };
}

function toBool(s: string): boolean | null {
  if (!s || !s.trim()) return null;
  const t = s.trim().toLowerCase();
  if (t === "si" || t === "true" || t === "sì") return true;
  if (t === "no" || t === "false") return false;
  return null;
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
  const getIdx = (name: string) => header.findIndex((h) => h.toLowerCase().includes(name));
  const giornoIdx = getIdx("giorno");
  const dataCaricamentoIdx = getIdx("data caricamento");
  const impiantoIdx = getIdx("impianto");
  const tecnicoIdx = getIdx("tecnico");
  const clienteFirmatarioIdx = getIdx("cliente firmatario");
  const noteIdx = getIdx("note");
  const firmaClienteIdx = getIdx("firma cliente");
  const firmaTecnicoIdx = getIdx("firma tecnico");
  const semParacaduteIdx = header.findIndex((h) => h.toLowerCase().includes("paracadute"));
  const semLimitatoreIdx = header.findIndex((h) => h.toLowerCase().includes("limitatore"));
  const semDispositiviIdx = header.findIndex((h) => h.toLowerCase().includes("dispositivi di sicurezza"));
  const semFuniIdx = header.findIndex((h) => h.toLowerCase().includes("condizione delle funi"));
  const semIsolamentoIdx = header.findIndex((h) => h.toLowerCase().includes("isolamento"));
  const semCollegamentiIdx = header.findIndex((h) => h.toLowerCase().includes("collegamenti con la terra"));
  const semOsservazioniIdx = header.findIndex((h) => h.toLowerCase().includes("osservazioni") && h.toLowerCase().includes("semestrali"));
  const semAttacchiIdx = header.findIndex((h) => h.toLowerCase().includes("attacchi funi"));
  const semEffettuaIdx = header.findIndex((h) => h.toLowerCase().includes("effettua semestrale"));

  const idGlideIdx = header.findIndex((h) => h.toLowerCase().includes("id manutenzione"));

  type CsvRow = {
    rowNum: number;
    glideId: string;
    impianto: string;
    tecnico: string;
    dateKey: string;
    ora: string | undefined;
    clienteFirmatario: string;
    note: string;
    firmaCliente: string;
    firmaTecnico: string;
    effettuaSemestrale: boolean;
    efficienzaParacadute: boolean | null;
    efficienzaLimitatoreVelocita: boolean | null;
    efficienzaDispositiviSicurezza: boolean | null;
    condizioneFuni: string | null;
    condizioneIsolamentoImpianto: string | null;
    efficienzaCollegamentiTerra: boolean | null;
    osservazioniSemestrale: string | null;
    condizioniAttacchiFuni: string | null;
    rawCols: string[];
  };

  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const impianto = (cols[impiantoIdx] ?? "").trim();
    const tecnico = (cols[tecnicoIdx] ?? "").trim();
    if (!impianto || !tecnico) continue;

    let dateKey: string | null = parseDateIt(cols[giornoIdx] ?? "");
    let ora: string | undefined;
    if (!dateKey && dataCaricamentoIdx >= 0) {
      const fromData = parseDateFromDataCaricamento(cols[dataCaricamentoIdx] ?? "");
      if (fromData) {
        dateKey = fromData.dateKey;
        ora = fromData.ora;
      }
    }
    if (!dateKey) continue;

    csvRows.push({
      rowNum: i + 1,
      glideId: (idGlideIdx >= 0 ? (cols[idGlideIdx] ?? "").trim() : "") || "",
      impianto,
      tecnico,
      dateKey,
      ora,
      clienteFirmatario: (cols[clienteFirmatarioIdx] ?? "").trim() || "—",
      note: (cols[noteIdx] ?? "").trim() || "",
      firmaCliente: (cols[firmaClienteIdx] ?? "").trim(),
      firmaTecnico: (cols[firmaTecnicoIdx] ?? "").trim(),
      effettuaSemestrale: toBool(cols[semEffettuaIdx] ?? "") === true,
      efficienzaParacadute: toBool(cols[semParacaduteIdx] ?? "") ?? null,
      efficienzaLimitatoreVelocita: toBool(cols[semLimitatoreIdx] ?? "") ?? null,
      efficienzaDispositiviSicurezza: toBool(cols[semDispositiviIdx] ?? "") ?? null,
      condizioneFuni: (cols[semFuniIdx] ?? "").trim() || null,
      condizioneIsolamentoImpianto: (cols[semIsolamentoIdx] ?? "").trim() || null,
      efficienzaCollegamentiTerra: toBool(cols[semCollegamentiIdx] ?? "") ?? null,
      osservazioniSemestrale: (cols[semOsservazioniIdx] ?? "").trim() || null,
      condizioniAttacchiFuni: (cols[semAttacchiIdx] ?? "").trim() || null,
      rawCols: cols,
    });
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

  const dbKeysNoGlide: { key: string; used: boolean }[] = dbManutenzioni
    .filter((m) => !m.glideId)
    .map((m) => {
      const d = new Date(m.dataManutenzione);
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const imp = (m.impianto?.numeroImpianto ?? "").trim();
      const tec = (m.tecnico?.name ?? "").trim();
      return { key: `${imp}|${tec}|${dk}`, used: false };
    });

  const impiantiByNum = new Map(
    (await prisma.impianto.findMany({ select: { id: true, numeroImpianto: true } })).map((i) => [(i.numeroImpianto ?? "").trim(), i.id])
  );
  const tecniciByName = new Map(
    (await prisma.user.findMany({ where: { role: "TECNICO" }, select: { id: true, name: true } })).map((u) => [u.name.trim().toLowerCase(), u])
  );

  const toImport: CsvRow[] = [];
  for (const row of csvRows) {
    if (row.glideId && dbGlideIds.has(row.glideId)) continue;
    if (!impiantiByNum.has(row.impianto) || !tecniciByName.has(row.tecnico.toLowerCase())) continue;
    if (row.glideId) {
      toImport.push(row);
      continue;
    }
    const key = `${row.impianto}|${row.tecnico}|${row.dateKey}`;
    const idx = dbKeysNoGlide.findIndex((k) => !k.used && k.key === key);
    if (idx < 0) toImport.push(row);
    else dbKeysNoGlide[idx].used = true;
  }

  console.log("\n--- Import manutenzioni mancanti ---");
  console.log("Righe da importare:", toImport.length);

  let created = 0;
  let errors = 0;
  for (const row of toImport) {
    if (row.glideId && (await prisma.manutenzione.findUnique({ where: { glideId: row.glideId } }))) {
      console.log(`  Skip riga ${row.rowNum}: glideId ${row.glideId} già presente in DB`);
      continue;
    }

    const impiantoId = impiantiByNum.get(row.impianto)!;
    const tecnico = tecniciByName.get(row.tecnico.toLowerCase())!;

    const [y, m, d] = row.dateKey.split("-").map(Number);
    const dataManutenzione = new Date(y, m - 1, d);
    if (row.ora) {
      const timeMatch = row.ora.match(/(\d{1,2}):(\d{1,2})/);
      if (timeMatch) dataManutenzione.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    }

    let firmaCliente: string | null = row.firmaCliente && row.firmaCliente.startsWith("http") ? await urlToBase64DataUrl(row.firmaCliente) : row.firmaCliente || null;
    let firmaTecnico: string | null = row.firmaTecnico && row.firmaTecnico.startsWith("http") ? await urlToBase64DataUrl(row.firmaTecnico) : row.firmaTecnico || null;

    try {
      const createdMan = await prisma.manutenzione.create({
        data: {
          glideId: row.glideId || null,
          dataManutenzione,
          oraEsecuzione: row.ora || null,
          tecnicoId: tecnico.id,
          impiantoId,
          clienteFirmatario: row.clienteFirmatario,
          firmaCliente,
          firmaTecnico,
          note: row.note || null,
          effettuaSemestrale: row.effettuaSemestrale,
          efficienzaParacadute: row.efficienzaParacadute,
          efficienzaLimitatoreVelocita: row.efficienzaLimitatoreVelocita,
          efficienzaDispositiviSicurezza: row.efficienzaDispositiviSicurezza,
          condizioneFuni: row.condizioneFuni,
          condizioneIsolamentoImpianto: row.condizioneIsolamentoImpianto,
          efficienzaCollegamentiTerra: row.efficienzaCollegamentiTerra,
          osservazioniSemestrale: row.osservazioniSemestrale,
          condizioniAttacchiFuni: row.condizioniAttacchiFuni,
        },
      });

      const full = await prisma.manutenzione.findUnique({
        where: { id: createdMan.id },
        include: { impianto: { include: { cliente: true } }, tecnico: true },
      });
      if (full) {
        const pdfPath = await generateRapportinoPDF(full);
        if (pdfPath) {
          const objectName = `Rapportino_${createdMan.id}.pdf`;
          const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
          if (supabaseUrl) {
            await prisma.manutenzione.update({ where: { id: createdMan.id }, data: { rapportinoPdf: supabaseUrl } });
          }
        }
      }
      console.log(`  OK riga ${row.rowNum}: ${row.impianto} ${row.dateKey} (${createdMan.id})`);
      created++;
    } catch (e) {
      console.error(`  ERR riga ${row.rowNum}:`, e);
      errors++;
    }
  }

  console.log("\n--- Fine: create", created, "errori", errors);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

/**
 * Importa dal CSV solo le manutenzioni NUOVE: salta tutte le righe il cui glideId
 * è già presente in DB e crea solo record per glideId non ancora importati.
 * Le righe senza glideId vengono saltate (per evitare duplicati).
 *
 * Eseguire dalla root: npx tsx scripts/import-only-new-manutenzioni-from-csv.ts "/path/to/MAN_ELENCO MANUTENZIONI.csv"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { urlToBase64DataUrl } from "../src/lib/signature-utils";
import { generateRapportinoPDF } from "../src/lib/rapportino-pdf/generate";
import { uploadPdfToSupabaseFromLocal, uploadPdfToSupabaseFromUrl } from "../src/lib/supabase-storage";

const prisma = new PrismaClient();

function splitCsvLogicalLines(content: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (c === "\n" || (c === "\r" && content[i + 1] === "\n"))) {
      lines.push(current);
      current = "";
      if (c === "\r") i++;
    } else if (c !== "\r" || inQuotes) {
      current += c;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

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
  const lines = splitCsvLogicalLines(content);
  const header = parseCsvLine(lines[0]);
  const getIdx = (name: string) => header.findIndex((h) => h.toLowerCase().includes(name));
  const giornoIdx = getIdx("giorno");
  const dataCaricamentoIdx = getIdx("data caricamento");
  const oraEsecuzioneIdx = getIdx("oraesecuzione");
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
  const rapportinoIdx = getIdx("rapportino");

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
    rapportinoUrl: string;
    effettuaSemestrale: boolean;
    efficienzaParacadute: boolean | null;
    efficienzaLimitatoreVelocita: boolean | null;
    efficienzaDispositiviSicurezza: boolean | null;
    condizioneFuni: string | null;
    condizioneIsolamentoImpianto: string | null;
    efficienzaCollegamentiTerra: boolean | null;
    osservazioniSemestrale: string | null;
    condizioniAttacchiFuni: string | null;
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

    const oraFromCol = oraEsecuzioneIdx >= 0 ? (cols[oraEsecuzioneIdx] ?? "").trim() : "";
    if (oraFromCol) ora = oraFromCol;
    else if (!ora && dataCaricamentoIdx >= 0) {
      const fromData = parseDateFromDataCaricamento(cols[dataCaricamentoIdx] ?? "");
      if (fromData?.ora) ora = fromData.ora;
    }

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
      rapportinoUrl: (rapportinoIdx >= 0 ? (cols[rapportinoIdx] ?? "").trim() : "") || "",
      effettuaSemestrale: toBool(cols[semEffettuaIdx] ?? "") === true,
      efficienzaParacadute: toBool(cols[semParacaduteIdx] ?? "") ?? null,
      efficienzaLimitatoreVelocita: toBool(cols[semLimitatoreIdx] ?? "") ?? null,
      efficienzaDispositiviSicurezza: toBool(cols[semDispositiviIdx] ?? "") ?? null,
      condizioneFuni: (cols[semFuniIdx] ?? "").trim() || null,
      condizioneIsolamentoImpianto: (cols[semIsolamentoIdx] ?? "").trim() || null,
      efficienzaCollegamentiTerra: toBool(cols[semCollegamentiIdx] ?? "") ?? null,
      osservazioniSemestrale: (cols[semOsservazioniIdx] ?? "").trim() || null,
      condizioniAttacchiFuni: (cols[semAttacchiIdx] ?? "").trim() || null,
    });
  }

  const existingGlideIds = new Set(
    (await prisma.manutenzione.findMany({ select: { glideId: true } }))
      .map((m) => m.glideId)
      .filter((g): g is string => !!g?.trim())
  );

  const impiantiByNum = new Map(
    (await prisma.impianto.findMany({ select: { id: true, numeroImpianto: true } })).map((i) => [(i.numeroImpianto ?? "").trim(), i.id])
  );
  const tecniciByName = new Map(
    (await prisma.user.findMany({ where: { role: "TECNICO" }, select: { id: true, name: true } })).map((u) => [u.name.trim().toLowerCase(), u])
  );

  const toAdd: CsvRow[] = [];
  let skippedExisting = 0;
  let skippedNoGlideId = 0;
  let skippedNoImpiantoOrTecnico = 0;

  for (const row of csvRows) {
    if (row.glideId && existingGlideIds.has(row.glideId)) {
      skippedExisting++;
      continue;
    }
    if (!row.glideId || !row.glideId.trim()) {
      skippedNoGlideId++;
      continue;
    }
    if (!impiantiByNum.has(row.impianto) || !tecniciByName.has(row.tecnico.toLowerCase())) {
      skippedNoImpiantoOrTecnico++;
      continue;
    }
    toAdd.push(row);
  }

  console.log("\n--- Import solo nuove manutenzioni (glideId non presenti in DB) ---");
  console.log("Righe CSV con data/impianto/tecnico validi:", csvRows.length);
  console.log("Saltate (glideId già in DB):", skippedExisting);
  console.log("Saltate (glideId vuoto):", skippedNoGlideId);
  console.log("Saltate (impianto o tecnico non in DB):", skippedNoImpiantoOrTecnico);
  console.log("Da aggiungere:", toAdd.length);

  const setRapportinoPdf = async (manutenzioneId: string, rapportinoUrlFromCsv: string) => {
    const objectName = `Rapportino_${manutenzioneId}.pdf`;
    if (rapportinoUrlFromCsv && (rapportinoUrlFromCsv.startsWith("http://") || rapportinoUrlFromCsv.startsWith("https://"))) {
      const supabaseUrl = await uploadPdfToSupabaseFromUrl(rapportinoUrlFromCsv, objectName, "rapportini");
      if (supabaseUrl) {
        await prisma.manutenzione.update({ where: { id: manutenzioneId }, data: { rapportinoPdf: supabaseUrl } });
        return;
      }
    }
    const full = await prisma.manutenzione.findUnique({
      where: { id: manutenzioneId },
      include: { impianto: { include: { cliente: true } }, tecnico: true },
    });
    if (!full) return;
    const pdfPath = await generateRapportinoPDF(full);
    if (pdfPath) {
      const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
      if (supabaseUrl) {
        await prisma.manutenzione.update({ where: { id: manutenzioneId }, data: { rapportinoPdf: supabaseUrl } });
      }
    }
  };

  let created = 0;
  let errors = 0;

  for (let i = 0; i < toAdd.length; i++) {
    const row = toAdd[i];
    if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${toAdd.length}`);

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
          glideId: row.glideId,
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
      await setRapportinoPdf(createdMan.id, row.rapportinoUrl);
      existingGlideIds.add(row.glideId);
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

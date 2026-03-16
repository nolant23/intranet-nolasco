/**
 * Import verifiche biennali da CSV.
 * Uso: node scripts/import-verifiche-biennali-from-csv.js [path/to/VERIFICHE BIENNALI.csv]
 *
 * Colonna IMPIANTO → collegamento a Impianto.numeroImpianto
 * Colonna TECNICO → collegamento a User.name (tecnici)
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

/** "07/03/2025, 0:00:00" -> Date */
function parseDataVerifica(s) {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim();
  const part = trimmed.split(",")[0]?.trim();
  if (!part) return null;
  const [d, m, y] = part.split("/").map((n) => parseInt(n, 10));
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

/** Fetch image URL and return data URL (base64) */
async function urlToBase64DataUrl(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn("Converti firma URL->base64 fallito:", url?.slice(0, 60), e.message);
    return null;
  }
}

async function main() {
  const filePath =
    process.argv[2] ||
    path.join(process.env.HOME || "", "Downloads", "VERIFICHE BIENNALI.csv");

  if (!fs.existsSync(filePath)) {
    console.error("File non trovato:", filePath);
    console.log("Uso: node scripts/import-verifiche-biennali-from-csv.js [path/to/VERIFICHE BIENNALI.csv]");
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.log("Nessuna riga da importare.");
    return;
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.findIndex((h) => h.trim().toUpperCase() === name.toUpperCase());
  const iDataVerifica = header.findIndex((h) => /DATA VERIFICA/i.test(h));
  const iImpianto = header.findIndex((h) => /^IMPIANTO$/i.test(h));
  const iFirmaCliente = header.findIndex((h) => /FIRMA CLIENTE/i.test(h));
  const iClienteFirmatario = header.findIndex((h) => /CLIENTE FIRMATARIO/i.test(h));
  const iEnteNotificato = header.findIndex((h) => /ENTE NOTIFICATO/i.test(h));
  const iIngegnere = header.findIndex((h) => /^INGEGNERE$/i.test(h));
  const iTecnico = header.findIndex((h) => /^TECNICO$/i.test(h));
  const iVerbale = header.findIndex((h) => /^Verbale$/i.test(h));
  const iPrescrizioni = header.findIndex((h) => /^PRESCRIZIONI$/i.test(h));

  if (iDataVerifica === -1 || iImpianto === -1) {
    console.error("Colonne obbligatorie non trovate. Header:", header);
    process.exit(1);
  }

  const impiantiByNumero = new Map();
  const impianti = await prisma.impianto.findMany({
    where: { numeroImpianto: { not: null } },
    select: { id: true, numeroImpianto: true },
  });
  impianti.forEach((imp) => {
    if (imp.numeroImpianto) impiantiByNumero.set(imp.numeroImpianto.trim(), imp.id);
  });

  const usersByName = new Map();
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  users.forEach((u) => {
    const key = u.name.trim().toLowerCase();
    if (!usersByName.has(key)) usersByName.set(key, u.id);
  });

  let created = 0;
  let skipped = 0;
  let noDate = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const get = (idx) => (idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : "");

    const dataVerificaStr = get(iDataVerifica);
    const dataVerifica = parseDataVerifica(dataVerificaStr);
    if (!dataVerifica) {
      noDate++;
      continue;
    }

    const numeroImpianto = get(iImpianto);
    const impiantoId = numeroImpianto ? impiantiByNumero.get(numeroImpianto) ?? null : null;

    const tecnicoName = get(iTecnico);
    const tecnicoId = tecnicoName
      ? usersByName.get(tecnicoName.toLowerCase()) ?? null
      : null;

    const firmaClienteUrlFromCsv = get(iFirmaCliente) || null;
    const firmaClienteBase64 = firmaClienteUrlFromCsv
      ? await urlToBase64DataUrl(firmaClienteUrlFromCsv)
      : null;
    const clienteFirmatario = get(iClienteFirmatario) || null;
    const enteNotificato = get(iEnteNotificato) || null;
    const ingegnere = get(iIngegnere) || null;
    const verbaleUrl = get(iVerbale) || null;
    const prescrizioni = get(iPrescrizioni) || null;

    try {
      await prisma.verificaBiennale.create({
        data: {
          dataVerifica,
          firmaCliente: firmaClienteBase64 || undefined,
          clienteFirmatario: clienteFirmatario || undefined,
          enteNotificato: enteNotificato || undefined,
          ingegnere: ingegnere || undefined,
          verbaleUrl: verbaleUrl || undefined,
          prescrizioni: prescrizioni || undefined,
          impiantoId: impiantoId || undefined,
          tecnicoId: tecnicoId || undefined,
        },
      });
      created++;
      if (created % 20 === 0) console.log("Importate", created, "verifiche...");
    } catch (err) {
      console.warn("Riga", i + 1, "errore:", err.message);
      skipped++;
    }
  }

  console.log("Fine. Create:", created, "Skip/error:", skipped, "Senza data valida:", noDate);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

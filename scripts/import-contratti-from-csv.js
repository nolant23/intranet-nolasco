const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

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

function parseDate(d) {
  if (!d || !d.trim()) return null;
  const [day, month, year] = d.split("/");
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseServizi(raw) {
  if (!raw || !raw.trim()) return [];
  const jsonText = `[${raw}]`;
  let arr;
  try {
    arr = JSON.parse(jsonText);
  } catch (e) {
    console.error("Errore parsing servizi:", raw, e.message);
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => {
    const nome = s.Servizio || "";
    const importo =
      typeof s.Importo === "number"
        ? s.Importo
        : s.Importo
        ? Number(s.Importo)
        : null;
    let inclusione = "INCLUSO";
    if (s.Incluso && String(s.Incluso).toLowerCase().includes("senza")) {
      inclusione = "INCLUSO_SENZA_COSTI";
    }
    const iva = s.IVA || null;
    return {
      nome,
      inclusione,
      importo: importo ?? 0,
      iva,
      ra: false,
    };
  });
}

async function main() {
  const filePath =
    process.argv[2] || "/Users/antoninonolasco/Downloads/CONTRATTI.csv";
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.log("Nessuna riga da importare.");
    return;
  }

  const header = parseCsvLine(lines[0]);

  const idx = (name) => header.indexOf(name);
  const iNumeroContratto = idx("N° Contratto");
  const iStato = idx("Stato Contratto");
  const iInizioContratto = idx("Inizio Contratto");
  const iScadenza = idx("Scadenza Contratto");
  const iDataEmissione = idx("Data emissione");
  const iDurata = idx("Durata (Anni)");
  const iTipologia = idx("Tipologia Contratto");
  const iNumeroVisite = idx("Numero visite annue");
  const iFatturazione = idx("Fatturazione");
  const iInizioFatt = idx("Inizio Fatturazione");
  const iNumeroImpianto = idx("Numero Impianto");
  const iServizi = idx("Servizi");

  const impianti = await prisma.impianto.findMany({
    select: { id: true, numeroImpianto: true },
  });
  const impByNumero = new Map(
    impianti
      .filter((i) => i.numeroImpianto)
      .map((i) => [String(i.numeroImpianto), i])
  );

  let imported = 0;
  let noImpianto = 0;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    if (row.length <= 1) continue;

    const numero = row[iNumeroContratto]?.trim();
    if (!numero) {
      console.warn("Riga senza numero contratto, saltata:", lines[li]);
      continue;
    }

    const numeroImpianto = row[iNumeroImpianto]?.trim();
    const imp = numeroImpianto ? impByNumero.get(numeroImpianto) : null;
    if (!imp) {
      console.warn(
        `Impianto non trovato per numeroImpianto=${numeroImpianto}, contratto ${numero} verrà creato senza collegamento.`
      );
      noImpianto++;
    }

    const dataEmissione = parseDate(row[iDataEmissione]);
    const dataContratto = parseDate(row[iInizioContratto]);
    const scadenzaContratto = parseDate(row[iScadenza]);
    const dataInizioFatturazione = parseDate(row[iInizioFatt]);

    const durataAnni = row[iDurata]?.trim()
      ? Number(row[iDurata])
      : null;
    const numeroVisiteAnnue = row[iNumeroVisite]?.trim()
      ? Number(row[iNumeroVisite])
      : null;

    const servizi = parseServizi(row[iServizi]);

    await prisma.contratto.upsert({
      where: { numero },
      update: {
        tipologia: row[iTipologia] || null,
        dataEmissione: dataEmissione || new Date(),
        dataContratto,
        scadenzaContratto,
        statoContratto: row[iStato] || null,
        durataAnni,
        numeroVisiteAnnue,
        periodicitaFatturazione: row[iFatturazione] || null,
        dataInizioFatturazione,
        impiantoId: imp ? imp.id : null,
        servizi: {
          deleteMany: {},
          create: servizi,
        },
      },
      create: {
        numero,
        tipologia: row[iTipologia] || null,
        dataEmissione: dataEmissione || new Date(),
        dataContratto,
        scadenzaContratto,
        statoContratto: row[iStato] || null,
        durataAnni,
        numeroVisiteAnnue,
        periodicitaFatturazione: row[iFatturazione] || null,
        dataInizioFatturazione,
        impiantoId: imp ? imp.id : null,
        servizi: {
          create: servizi,
        },
      },
    });

    imported++;
  }

  console.log(
    `Import completato. Contratti importati/aggiornati: ${imported}. Di cui senza impianto collegato: ${noImpianto}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


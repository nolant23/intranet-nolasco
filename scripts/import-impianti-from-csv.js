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

async function main() {
  const filePath =
    process.argv[2] ||
    "/Users/antoninonolasco/Downloads/MAN_Parco Impianti Nolasco.csv";
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.log("Nessuna riga da importare.");
    return;
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.indexOf(name);

  const iNumeroImpianto = idx("# Impianto");
  const iIndirizzo = idx("Indirizzo");
  const iComune = idx("Comune");
  const iProvincia = idx("Provincia");
  const iTipologia = idx("Tipologia");
  const iModello = idx("Modello");
  const iMatricola = idx("Matricola");
  const iPortata = idx("Portata");
  const iFermate = idx("Fermate");
  const iServizi = idx("Servizi");
  const iCostruttore = idx("Costruttore");
  const iIdAmm = idx("Amministratore/ID AMM_IMP");
  const iClienteFic = idx("Cliente/ID CLIENTE FIC");
  const iNumeroFabbrica = idx("Numero di fabbrica");
  const iEnteNotificato = idx("Ente Notificato");

  const existingImpianti = await prisma.impianto.findMany({
    select: { id: true, numeroImpianto: true },
  });
  const existingByNumero = new Set(
    existingImpianti
      .filter((i) => i.numeroImpianto)
      .map((i) => String(i.numeroImpianto))
  );

  const amministratori = await prisma.amministratore.findMany({
    select: { id: true, glideIdAmm: true },
  });
  const ammByGlide = new Map(
    amministratori
      .filter((a) => a.glideIdAmm)
      .map((a) => [String(a.glideIdAmm), a])
  );

  const clienti = await prisma.cliente.findMany({
    select: { id: true, ficId: true },
  });
  const clienteByFic = new Map(
    clienti.filter((c) => c.ficId).map((c) => [String(c.ficId), c])
  );

  let created = 0;
  let skippedExisting = 0;
  let skippedNoCliente = 0;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    if (row.length <= 1) continue;

    const numeroImpianto = row[iNumeroImpianto]?.trim();
    if (!numeroImpianto || numeroImpianto.toLowerCase() === "da registrare") {
      continue;
    }

    if (existingByNumero.has(numeroImpianto)) {
      skippedExisting++;
      continue;
    }

    const indirizzo = row[iIndirizzo]?.trim() || "";
    const comune = row[iComune]?.trim() || "";
    const provincia = row[iProvincia]?.trim() || "";

    if (!indirizzo || !comune) {
      console.warn(
        `Riga ${li + 1}: indirizzo/comune mancanti per impianto ${numeroImpianto}, saltato.`
      );
      continue;
    }

    const tipologia = row[iTipologia]?.trim() || null;
    const modello = row[iModello]?.trim() || null;
    const matricola = row[iMatricola]?.trim() || null;
    const portata = row[iPortata]?.trim()
      ? Number(row[iPortata])
      : null;
    const fermate = row[iFermate]?.trim()
      ? Number(row[iFermate])
      : null;
    const servizi = row[iServizi]?.trim()
      ? Number(row[iServizi])
      : null;
    const costruttore = row[iCostruttore]?.trim() || null;

    const idAmm = row[iIdAmm]?.trim();
    const amm = idAmm ? ammByGlide.get(idAmm) : null;

    const ficId = row[iClienteFic]?.trim();
    const cliente = ficId ? clienteByFic.get(ficId) : null;
    if (!cliente && ficId) {
      console.warn(
        `Cliente non trovato per ficId=${ficId} (impianto ${numeroImpianto}), l'impianto verrà comunque creato senza collegamento cliente.`
      );
      skippedNoCliente++;
    }

    const numeroFabbrica = row[iNumeroFabbrica]?.trim() || null;
    const enteNotificato = row[iEnteNotificato]?.trim() || null;

    await prisma.impianto.create({
      data: {
        numeroImpianto,
        indirizzo,
        comune,
        provincia,
        tipologia,
        modello,
        matricola,
        portata,
        fermate,
        servizi,
        costruttore,
        enteNotificato,
        numeroFabbrica,
        glideAmministratoreIdAmmImp: idAmm || null,
        amministratoreId: amm ? amm.id : null,
        glideClienteIdClienteFic: ficId || null,
        clienteId: cliente ? cliente.id : null,
      },
    });

    created++;
  }

  console.log(
    `Import impianti completato. Creati: ${created}. Saltati (esistente): ${skippedExisting}. Saltati per cliente mancante: ${skippedNoCliente}.`
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


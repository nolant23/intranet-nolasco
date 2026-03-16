// scripts/update-contratti-dates-from-csv.js
//
// Legge il file "check date.csv" e aggiorna le date dei contratti
// abbinando il campo "Contratto" al campo "numero" del modello Contratto.
//
// Colonne CSV:
// 0: Contratto (es. 25-000052)
// 1: Data contratto          (gg/MM/yyyy)
// 2: Data emissione          (gg/MM/yyyy)
// 3: Scadenza contratto      (gg/MM/yyyy)
// 4: Data inizio fatturazione(gg/MM/yyyy)

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseItalianDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  // Mesi JS 0-based
  return new Date(yyyy, mm - 1, dd);
}

async function main() {
  // Percorso reale del file CSV fornito dall'utente
  // (/Users/antoninonolasco/Downloads/check date.csv)
  const csvPath = path.join(
    "/Users",
    "antoninonolasco",
    "Downloads",
    "check date.csv"
  );

  if (!fs.existsSync(csvPath)) {
    console.error("File CSV non trovato:", csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // salta header
  const dataLines = lines.slice(1);

  console.log(`Righe CSV (escluso header): ${dataLines.length}`);

  let updatedCount = 0;
  let notFound = 0;

  for (const line of dataLines) {
    const cols = line.split(",");
    if (!cols[0]) continue;

    const numero = cols[0].trim();
    const dataContrattoStr = cols[1] || "";
    const dataEmissioneStr = cols[2] || "";
    const scadenzaContrattoStr = cols[3] || "";
    const dataInizioFatturazioneStr = cols[4] || "";

    const dataContratto = parseItalianDate(dataContrattoStr);
    const dataEmissione = parseItalianDate(dataEmissioneStr);
    const scadenzaContratto = parseItalianDate(scadenzaContrattoStr);
    const dataInizioFatturazione = parseItalianDate(
      dataInizioFatturazioneStr
    );

    const contratto = await prisma.contratto.findUnique({
      where: { numero },
      select: { id: true },
    });

    if (!contratto) {
      console.warn(`Contratto non trovato per numero ${numero}`);
      notFound++;
      continue;
    }

    await prisma.contratto.update({
      where: { numero },
      data: {
        // Se la data nel CSV è vuota, lasciamo NULL nel DB
        dataContratto,
        dataEmissione,
        scadenzaContratto,
        dataInizioFatturazione,
      },
    });

    updatedCount++;
    console.log(
      `Aggiornato contratto ${numero} -> dataContratto=${dataContrattoStr}, dataEmissione=${dataEmissioneStr}, scadenza=${scadenzaContrattoStr}, inizioFatt=${dataInizioFatturazioneStr}`
    );
  }

  console.log("----");
  console.log("Contratti aggiornati:", updatedCount);
  console.log("Contratti non trovati:", notFound);
}

main()
  .catch((e) => {
    console.error("Errore nello script:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


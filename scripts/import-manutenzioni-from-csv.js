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

async function downloadAsDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Download firma fallito:", url, res.status);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn("Errore download firma:", url, e.message);
    return null;
  }
}

async function main() {
  const filePath =
    process.argv[2] ||
    "/Users/antoninonolasco/Downloads/MAN_ELENCO MANUTENZIONI.csv";

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.log("Nessuna riga da importare.");
    return;
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.indexOf(name);

  const iDataCaricamento = idx("DATA CARICAMENTO");
  const iFirmaCliente = idx("FIRMA CLIENTE");
  const iFirmaTecnico = idx("FIRMA TECNICO");
  const iClienteFirmatario = idx("CLIENTE FIRMATARIO");
  const iImpianto = idx("IMPIANTO");
  const iTecnico = idx("TECNICO");
  const iNote = idx("Note");
  const iEffettuaSemestrale = idx("Semestrali/Effettua Semestrale");
  const iEffParacadute = idx("Semestrali/Efficienza paracadute");
  const iEffLimitatore = idx("Semestrali/Efficienza limitatore di velocità");
  const iEffDispositivi = idx(
    "Semestrali/Efficienza dei dispositivi di sicurezza"
  );
  const iCondFuni = idx("Semestrali/Condizione delle funi");
  const iCondAttacchiFuni = idx("Semestrali/Condizioni degli attacchi funi");
  const iCondIsolamento = idx(
    "Semestrali/Condizione dell'isolamento dell'impianto elettrico (>2000 Ω/V con minimo di 250 kΩ)"
  );
  const iEffTerra = idx(
    "Semestrali/Efficienza dei collegamenti con la terra"
  );
  const iOsservazioniSem = idx("Semestrali/Osservazioni");

  if (
    iDataCaricamento === -1 ||
    iFirmaCliente === -1 ||
    iFirmaTecnico === -1 ||
    iClienteFirmatario === -1 ||
    iImpianto === -1 ||
    iTecnico === -1
  ) {
    console.error("Header CSV non riconosciuto, verifica i nomi colonna.");
    return;
  }

  const impianti = await prisma.impianto.findMany({
    select: { id: true, numeroImpianto: true },
  });
  const impiantoByNumero = new Map(
    impianti
      .filter((i) => i.numeroImpianto)
      .map((i) => [String(i.numeroImpianto).trim(), i])
  );

  const tecnici = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  const tecnicoByName = new Map(
    tecnici.map((t) => [t.name.trim().toLowerCase(), t])
  );

  const existing = await prisma.manutenzione.findMany({
    select: { id: true, impiantoId: true, dataManutenzione: true, clienteFirmatario: true },
  });
  const existingKeys = new Set(
    existing.map((m) =>
      `${m.impiantoId}|${m.dataManutenzione.toISOString().slice(0, 10)}|${
        m.clienteFirmatario || ""
      }`
    )
  );

  let created = 0;
  let skippedNoImpianto = 0;
  let skippedNoTecnico = 0;
  let skippedDuplicate = 0;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    if (row.length <= 1) continue;

    const numeroImpianto = row[iImpianto]?.trim();
    if (!numeroImpianto) continue;

    const imp = impiantoByNumero.get(numeroImpianto);
    if (!imp) {
      console.warn(
        `Riga ${li + 1}: impianto non trovato per numeroImpianto=${numeroImpianto}, manutenzione saltata.`
      );
      skippedNoImpianto++;
      continue;
    }

    const tecnicoNome = (row[iTecnico] || "").trim();
    const tecnico = tecnicoByName.get(tecnicoNome.toLowerCase());
    if (!tecnico) {
      console.warn(
        `Riga ${li + 1}: tecnico non trovato per nome='${tecnicoNome}', manutenzione saltata.`
      );
      skippedNoTecnico++;
      continue;
    }

    const dataRaw = row[iDataCaricamento]?.trim().replace(/"/g, "");
    if (!dataRaw) continue;
    const [dataPart, timePartRaw] = dataRaw.split(",");
    const [day, month, year] = dataPart.split("/").map((n) => parseInt(n, 10));
    if (!day || !month || !year) continue;
    const dataManutenzione = new Date(year, month - 1, day);
    const oraEsecuzione = (timePartRaw || "").trim();

    const clienteFirmatario = (row[iClienteFirmatario] || "").trim();

    const key = `${imp.id}|${dataManutenzione.toISOString().slice(
      0,
      10
    )}|${clienteFirmatario}`;
    if (existingKeys.has(key)) {
      skippedDuplicate++;
      continue;
    }

    const firmaClienteUrl = row[iFirmaCliente]?.trim() || "";
    const firmaTecnicoUrl = row[iFirmaTecnico]?.trim() || "";

    const [firmaCliente, firmaTecnico] = await Promise.all([
      downloadAsDataUrl(firmaClienteUrl),
      downloadAsDataUrl(firmaTecnicoUrl),
    ]);

    const effettuaSemestraleRaw = row[iEffettuaSemestrale]?.trim() || "";
    const effettuaSemestrale =
      effettuaSemestraleRaw !== "" &&
      !/^no$/i.test(effettuaSemestraleRaw) &&
      !/^false$/i.test(effettuaSemestraleRaw);

    const toBool = (val) => {
      const v = (val || "").trim().toLowerCase();
      if (!v) return null;
      if (["si", "sì", "yes", "true"].includes(v)) return true;
      if (["no", "false"].includes(v)) return false;
      return null;
    };

    const effParacadute = toBool(row[iEffParacadute]);
    const effLimitatore = toBool(row[iEffLimitatore]);
    const effDispositivi = toBool(row[iEffDispositivi]);
    const condFuni = row[iCondFuni]?.trim() || null;
    const condAttacchiFuni = row[iCondAttacchiFuni]?.trim() || null;
    const condIsolamento = row[iCondIsolamento]?.trim() || null;
    const effTerra = toBool(row[iEffTerra]);
    const osservSem = row[iOsservazioniSem]?.trim() || null;

    const note = row[iNote]?.trim() || "";

    await prisma.manutenzione.create({
      data: {
        dataManutenzione,
        oraEsecuzione: oraEsecuzione || null,
        tecnicoId: tecnico.id,
        impiantoId: imp.id,
        clienteFirmatario,
        firmaTecnico: firmaTecnico,
        firmaCliente: firmaCliente,
        note: note || null,
        effettuaSemestrale,
        efficienzaParacadute: effParacadute,
        efficienzaLimitatoreVelocita: effLimitatore,
        efficienzaDispositiviSicurezza: effDispositivi,
        condizioneFuni: condFuni,
        condizioniAttacchiFuni: condAttacchiFuni,
        condizioneIsolamentoImpianto: condIsolamento,
        efficienzaCollegamentiTerra: effTerra,
        osservazioniSemestrale: osservSem,
      },
    });

    existingKeys.add(key);
    created++;
  }

  console.log(
    `Import manutenzioni completato. Create: ${created}, duplicate: ${skippedDuplicate}, senza impianto: ${skippedNoImpianto}, senza tecnico: ${skippedNoTecnico}.`
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


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

async function downloadImageToFile(url, baseDir, prefix) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Download immagine fallito:", url, res.status);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";

    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const safeName = `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const filePath = path.join(baseDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // percorso relativo usato dall'app
    return `/uploads/interventi/${safeName}`;
  } catch (e) {
    console.warn("Errore download immagine:", url, e.message);
    return null;
  }
}

async function main() {
  const filePath =
    process.argv[2] ||
    "/Users/antoninonolasco/Downloads/INTERVENTI NOLASCO.csv";

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    console.log("Nessuna riga da importare.");
    return;
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.indexOf(name);

  const iBolla = idx("# BOLLA");
  const iImpianto = idx("Impianto");
  const iTecnico = idx("Tecnico");
  const iGiorno = idx("giorno");
  const iStart = idx("Start");
  const iEnd = idx("End");
  const iDescrizione = idx("Descrizione Intervento");
  const iFirmaCliente = idx("Firma Cliente");
  const iFirmaTecnico = idx("Firma Tecnico");
  const iRapportinoPdf = idx("Rapportino PDF");
  const iClienteFirmatario = idx("Nome Cliente firmatario");
  const iUrlImage = idx("URL IMAGE");
  const iMateriale = idx("Materiale da ordinare");
  const iParti = idx("Parti installate o sostituite");

  if (
    iBolla === -1 ||
    iImpianto === -1 ||
    iTecnico === -1 ||
    iGiorno === -1 ||
    iStart === -1
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

  const existingInterventi = await prisma.intervento.findMany({
    select: { id: true, numeroRapportino: true },
  });
  const existingByNumero = new Set(
    existingInterventi
      .map((i) => i.numeroRapportino)
      .filter((v) => typeof v === "string")
  );

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "interventi"
  );

  let created = 0;
  let skippedNoImpianto = 0;
  let skippedNoTecnico = 0;
  let skippedDuplicate = 0;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    if (row.length <= 1) continue;

    const bollaRaw = (row[iBolla] || "").trim();
    if (!bollaRaw) continue;
    // es: "1/2023" -> "001/2023"
    let numeroRapportino = bollaRaw;
    const parts = bollaRaw.split("/");
    if (parts.length === 2) {
      const num = parts[0].trim();
      const year = parts[1].trim();
      const numPadded = String(parseInt(num, 10)).padStart(3, "0");
      numeroRapportino = `${numPadded}/${year}`;
    }

    if (existingByNumero.has(numeroRapportino)) {
      skippedDuplicate++;
      continue;
    }

    const numeroImpianto = (row[iImpianto] || "").trim();
    if (!numeroImpianto) continue;
    const imp = impiantoByNumero.get(numeroImpianto);
    if (!imp) {
      console.warn(
        `Riga ${li + 1}: impianto non trovato per numeroImpianto=${numeroImpianto}, intervento saltato.`
      );
      skippedNoImpianto++;
      continue;
    }

    const tecnicoNome = (row[iTecnico] || "").trim();
    const tecnico = tecnicoByName.get(tecnicoNome.toLowerCase());
    if (!tecnico) {
      console.warn(
        `Riga ${li + 1}: tecnico non trovato per nome='${tecnicoNome}', intervento saltato.`
      );
      skippedNoTecnico++;
      continue;
    }

    const giornoRaw = (row[iGiorno] || "").trim().replace(/"/g, "");
    if (!giornoRaw) continue;
    const [day, month, year] = giornoRaw
      .split("/")
      .map((n) => parseInt(n, 10));
    if (!day || !month || !year) continue;
    const dataIntervento = new Date(year, month - 1, day);

    const oraInizio = (row[iStart] || "").trim();
    const oraFine = (row[iEnd] || "").trim();
    const descrizione = (row[iDescrizione] || "").trim() || null;
    const clienteFirmatario = (row[iClienteFirmatario] || "").trim();
    const materialeOrdinare = (row[iMateriale] || "").trim() || null;
    const partiSostituite = (row[iParti] || "").trim() || null;

    const firmaClienteUrl = (row[iFirmaCliente] || "").trim();
    const firmaTecnicoUrl = (row[iFirmaTecnico] || "").trim();
    const rapportinoPdfUrl = (row[iRapportinoPdf] || "").trim() || null;

    const [firmaCliente, firmaTecnico] = await Promise.all([
      downloadAsDataUrl(firmaClienteUrl),
      downloadAsDataUrl(firmaTecnicoUrl),
    ]);

    // Gestione immagini multiple nella colonna URL IMAGE
    let fotoPaths = [];
    const imagesRaw = (row[iUrlImage] || "").trim();
    if (imagesRaw) {
      // la colonna può contenere più URL separati da virgola
      const urls = imagesRaw
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      for (let i = 0; i < urls.length; i++) {
        const rel = await downloadImageToFile(
          urls[i],
          uploadsDir,
          `import_${li + 1}_${i + 1}`
        );
        if (rel) fotoPaths.push(rel);
      }
    }

    await prisma.intervento.create({
      data: {
        numeroRapportino,
        dataIntervento,
        oraInizio,
        oraFine,
        tecnicoId: tecnico.id,
        impiantoId: imp.id,
        descrizione,
        partiSostituite,
        materialeOrdinare,
        foto: fotoPaths.length ? JSON.stringify(fotoPaths) : "[]",
        clienteFirmatario,
        firmaTecnico: firmaTecnico,
        firmaCliente: firmaCliente,
        rapportinoPdf: rapportinoPdfUrl,
      },
    });

    existingByNumero.add(numeroRapportino);
    created++;

    // Piccola pausa ogni 20 righe per non stressare il DB / rete
    if (created % 20 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `Import interventi completato. Creati: ${created}, duplicati: ${skippedDuplicate}, senza impianto: ${skippedNoImpianto}, senza tecnico: ${skippedNoTecnico}.`
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


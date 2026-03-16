const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "nolasco-files";

async function uploadPdfBufferToSupabase(buffer, objectName) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti: salto upload."
    );
    return null;
  }

  const objectPath = `rapportini/${objectName}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "Errore upload PDF su Supabase:",
      res.status,
      res.statusText,
      text
    );
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;

  return publicUrl;
}

async function main() {
  const interventi = await prisma.intervento.findMany({
    select: { id: true, numeroRapportino: true, rapportinoPdf: true },
    where: {
      rapportinoPdf: {
        not: null,
      },
    },
  });

  const toMigrate = interventi.filter((i) => {
    const url = i.rapportinoPdf || "";
    // consideriamo da migrare i link esterni (http/https) o quelli che puntano a Glide
    return url.startsWith("http://") || url.startsWith("https://");
  });

  console.log(
    `Interventi trovati: ${interventi.length}. Da migrare (link remoti): ${toMigrate.length}.`
  );

  let migrated = 0;
  let skipped = 0;

  for (let idx = 0; idx < toMigrate.length; idx++) {
    const it = toMigrate[idx];
    const url = it.rapportinoPdf;
    if (!url) {
      skipped++;
      continue;
    }

    console.log(
      `[${idx + 1}/${toMigrate.length}] Intervento ${it.id} (${it.numeroRapportino ||
        "-"}) - scarico PDF da ${url}`
    );

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(
          `  Download fallito (${res.status} ${res.statusText}), salto questo intervento.`
        );
        skipped++;
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const objectName = `Intervento_${it.id}.pdf`;
      const publicUrl = await uploadPdfBufferToSupabase(buffer, objectName);

      if (!publicUrl) {
        console.warn("  Upload fallito, salto aggiornamento DB.");
        skipped++;
        continue;
      }

      await prisma.intervento.update({
        where: { id: it.id },
        data: {
          rapportinoPdf: publicUrl,
        },
      });

      migrated++;

      // Piccola pausa ogni 10 upload per non stressare Supabase
      if (migrated % 10 === 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error("  Errore durante migrazione PDF intervento:", err);
      skipped++;
    }
  }

  console.log(
    `Migrazione PDF interventi completata. Migrati: ${migrated}, saltati: ${skipped}.`
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


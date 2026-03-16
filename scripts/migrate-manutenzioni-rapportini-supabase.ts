/**
 * Script una tantum: per ogni manutenzione genera il rapportino PDF (se non già su Supabase),
 * lo carica su Supabase Storage e aggiorna il campo rapportinoPdf.
 *
 * Prerequisiti:
 * - .env con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET (opzionale)
 * - Eseguire dalla root: npx tsx scripts/migrate-manutenzioni-rapportini-supabase.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateRapportinoPDF } from "../src/lib/rapportino-pdf/generate";
import { uploadPdfToSupabaseFromLocal } from "../src/lib/supabase-storage";

const prisma = new PrismaClient();

const HAS_SUPABASE_URL =
  (url: string | null) =>
    url != null && url.includes("/storage/v1/object/public/");

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const manutenzioni = await prisma.manutenzione.findMany({
    include: {
      impianto: { include: { cliente: true } },
      tecnico: true,
    },
    orderBy: { dataManutenzione: "desc" },
  });

  console.log(`\n--- Manutenzioni: ${manutenzioni.length} totali ---`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const m of manutenzioni) {
    if (HAS_SUPABASE_URL(m.rapportinoPdf)) {
      skip++;
      continue;
    }

    try {
      const pdfPath = await generateRapportinoPDF(m);
      if (!pdfPath) {
        console.warn(`  SKIP Manutenzione ${m.id} (impianto ${m.impianto?.numeroImpianto ?? "?"}): generazione PDF fallita`);
        fail++;
        continue;
      }

      const objectName = `Rapportino_${m.id}.pdf`;
      const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
      if (supabaseUrl) {
        await prisma.manutenzione.update({
          where: { id: m.id },
          data: { rapportinoPdf: supabaseUrl },
        });
        const impiantoLabel = m.impianto?.numeroImpianto ?? m.impiantoId;
        console.log(`  OK ${impiantoLabel} ${m.dataManutenzione.toISOString().slice(0, 10)} -> Supabase`);
        ok++;
      } else {
        console.warn(`  FAIL Manutenzione ${m.id}: upload Supabase fallito`);
        fail++;
      }
    } catch (e) {
      console.error(`  ERR Manutenzione ${m.id}:`, e);
      fail++;
    }
  }

  console.log(`\n--- Riepilogo: ${ok} caricati, ${skip} già su Supabase, ${fail} errori/skip ---\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

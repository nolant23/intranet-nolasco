/**
 * Script una tantum: trasferisce i PDF di fatture e note di credito
 * attualmente in public/uploads/ su Supabase Storage e aggiorna il DB.
 *
 * Prerequisiti:
 * - .env con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET (opzionale)
 * - Eseguire dalla root: npx tsx scripts/migrate-pdf-to-supabase.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { uploadPdfToSupabaseFromLocal } from "../src/lib/supabase-storage";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  let fattureOk = 0;
  let fattureSkip = 0;
  let fattureFail = 0;

  const fattureConUpload = await prisma.fattura.findMany({
    where: { urlDocumento: { startsWith: "/uploads/fatture/" } },
    select: { id: true, ficId: true, numero: true, urlDocumento: true },
  });

  console.log(`\n--- Fatture: ${fattureConUpload.length} con PDF in /uploads/ ---`);

  for (const f of fattureConUpload) {
    const url = f.urlDocumento!;
    const filename = url.replace(/^\/uploads\/fatture\//, "") || `fattura_${f.ficId}.pdf`;
    const supabaseUrl = await uploadPdfToSupabaseFromLocal(url, filename, "fatture");
    if (supabaseUrl) {
      await prisma.fattura.update({
        where: { id: f.id },
        data: { urlDocumento: supabaseUrl },
      });
      console.log(`  OK Fattura ${f.numero} (${f.ficId}) -> Supabase`);
      fattureOk++;
    } else {
      const fs = await import("fs");
      const path = await import("path");
      const abs = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      if (!fs.existsSync(abs)) {
        console.log(`  SKIP Fattura ${f.numero}: file non trovato in ${url}`);
        fattureSkip++;
      } else {
        console.log(`  FAIL Fattura ${f.numero}: upload fallito`);
        fattureFail++;
      }
    }
  }

  let noteOk = 0;
  let noteSkip = 0;
  let noteFail = 0;

  const noteConUpload = await prisma.notaCredito.findMany({
    where: { urlDocumento: { startsWith: "/uploads/note-credito/" } },
    select: { id: true, ficId: true, numero: true, urlDocumento: true },
  });

  console.log(`\n--- Note di credito: ${noteConUpload.length} con PDF in /uploads/ ---`);

  for (const n of noteConUpload) {
    const url = n.urlDocumento!;
    const filename = url.replace(/^\/uploads\/note-credito\//, "") || `nota_credito_${n.ficId}.pdf`;
    const supabaseUrl = await uploadPdfToSupabaseFromLocal(url, filename, "note-credito");
    if (supabaseUrl) {
      await prisma.notaCredito.update({
        where: { id: n.id },
        data: { urlDocumento: supabaseUrl },
      });
      console.log(`  OK Nota ${n.numero} (${n.ficId}) -> Supabase`);
      noteOk++;
    } else {
      const fs = await import("fs");
      const path = await import("path");
      const abs = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      if (!fs.existsSync(abs)) {
        console.log(`  SKIP Nota ${n.numero}: file non trovato in ${url}`);
        noteSkip++;
      } else {
        console.log(`  FAIL Nota ${n.numero}: upload fallito`);
        noteFail++;
      }
    }
  }

  console.log("\n--- Riepilogo ---");
  console.log(`Fatture: ${fattureOk} migrate, ${fattureSkip} skip (file assente), ${fattureFail} errore upload`);
  console.log(`Note di credito: ${noteOk} migrate, ${noteSkip} skip (file assente), ${noteFail} errore upload`);
  console.log("Fatto.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

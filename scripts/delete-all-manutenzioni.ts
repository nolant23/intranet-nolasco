/**
 * Elimina TUTTE le manutenzioni dal database.
 * Usare prima di una re-importazione completa da CSV.
 *
 * Eseguire dalla root: npx tsx scripts/delete-all-manutenzioni.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.manutenzione.count();
  console.log("Manutenzioni attuali in DB:", count);
  if (count === 0) {
    console.log("Nessuna manutenzione da eliminare.");
    return;
  }

  const result = await prisma.manutenzione.deleteMany({});
  console.log("Eliminate", result.count, "manutenzioni.");
  console.log("Fine.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

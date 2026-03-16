/**
 * Converte le firme (firmaCliente, firmaTecnico) da URL a base64 per le due
 * manutenzioni del 12/03/2026 (A23M3644 e A25M0223).
 *
 * Eseguire dalla root: npx tsx scripts/convert-firme-url-to-base64.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { urlToBase64DataUrl } from "../src/lib/signature-utils";

const prisma = new PrismaClient();

const DATA_MANUTENZIONE = new Date("2026-03-12");

async function main() {
  const dayStart = new Date(DATA_MANUTENZIONE.getFullYear(), DATA_MANUTENZIONE.getMonth(), DATA_MANUTENZIONE.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const manutenzioni = await prisma.manutenzione.findMany({
    where: {
      dataManutenzione: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, impiantoId: true, firmaCliente: true, firmaTecnico: true },
  });

  const impianti = await prisma.impianto.findMany({
    where: { id: { in: manutenzioni.map((m) => m.impiantoId) } },
    select: { id: true, numeroImpianto: true },
  });
  const impiantiByNum = Object.fromEntries(impianti.map((i) => [i.numeroImpianto, i]));

  for (const m of manutenzioni) {
    const impianto = impianti.find((i) => i.id === m.impiantoId);
    const label = impianto?.numeroImpianto ?? m.id;

    let firmaCliente = m.firmaCliente;
    let firmaTecnico = m.firmaTecnico;

    if (firmaTecnico && firmaTecnico.startsWith("http")) {
      const dataUrl = await urlToBase64DataUrl(firmaTecnico);
      if (dataUrl) firmaTecnico = dataUrl;
      else console.warn(`  [${label}] firmaTecnico: conversione fallita`);
    }
    if (firmaCliente && firmaCliente.startsWith("http")) {
      const dataUrl = await urlToBase64DataUrl(firmaCliente);
      if (dataUrl) firmaCliente = dataUrl;
      else console.warn(`  [${label}] firmaCliente: conversione fallita`);
    }

    if (firmaCliente !== m.firmaCliente || firmaTecnico !== m.firmaTecnico) {
      await prisma.manutenzione.update({
        where: { id: m.id },
        data: { firmaCliente: firmaCliente ?? undefined, firmaTecnico: firmaTecnico ?? undefined },
      });
      console.log(`  OK ${label}: firme convertite in base64`);
    } else {
      console.log(`  Skip ${label}: nessuna firma URL da convertire`);
    }
  }

  console.log("\nFine.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

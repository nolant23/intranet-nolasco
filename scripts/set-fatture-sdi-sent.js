// Imposta statoFatturaElettronica = "sent" per tutte le fatture esistenti
// Uso:
//   cd intranet-nolasco
//   node scripts/set-fatture-sdi-sent.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.fattura.updateMany({
      data: {
        statoFatturaElettronica: "sent",
      },
    });

    console.log(
      `Aggiornate ${result.count} fatture: statoFatturaElettronica = "sent".`
    );
  } catch (error) {
    console.error("Errore durante l'aggiornamento delle fatture:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


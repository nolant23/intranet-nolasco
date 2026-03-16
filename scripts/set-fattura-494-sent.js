// Imposta statoFatturaElettronica = "sent" per la fattura con numero 494
// Uso:
//   cd intranet-nolasco
//   node scripts/set-fattura-494-sent.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.fattura.updateMany({
      where: { numero: "494" },
      data: {
        statoFatturaElettronica: "sent",
      },
    });

    console.log(
      `Aggiornate ${result.count} fatture con numero 494 a statoFatturaElettronica = "sent".`
    );
  } catch (error) {
    console.error("Errore durante l'aggiornamento della fattura 494:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


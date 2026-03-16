// scripts/delete-servizi-incluso-senza-costi.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Solo per vedere quanti record verranno toccati
  const countBefore = await prisma.servizioContratto.count({
    where: { inclusione: "INCLUSO_SENZA_COSTI" },
  });
  console.log(
    `Servizi con inclusione = "INCLUSO_SENZA_COSTI" trovati: ${countBefore}`
  );

  if (countBefore === 0) {
    console.log("Nessun servizio da eliminare. Fine.");
    return;
  }

  const result = await prisma.servizioContratto.deleteMany({
    where: { inclusione: "INCLUSO_SENZA_COSTI" },
  });

  console.log(`Servizi eliminati: ${result.count}`);
}

main()
  .catch((e) => {
    console.error("Errore nello script:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const toDelete = await prisma.impianto.findMany({
    where: { clienteId: null },
    select: { id: true, numeroImpianto: true },
  });

  console.log(
    `Impianti con clienteId null da eliminare: ${toDelete.length}`,
    toDelete.map((i) => i.numeroImpianto)
  );

  await prisma.impianto.deleteMany({
    where: { id: { in: toDelete.map((i) => i.id) } },
  });

  console.log("Impianti senza cliente eliminati.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


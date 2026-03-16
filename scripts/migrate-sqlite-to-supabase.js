// scripts/set-ra-condomini.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const servizi = await prisma.servizioContratto.findMany({
    where: {
      nome: { contains: "manutenzione ordinaria", mode: "insensitive" },
      OR: [{ ra: false }, { ra: null }],
      contratto: {
        impianto: {
          cliente: {
            tipologia: "Condominio",
          },
        },
      },
    },
    include: {
      contratto: {
        include: {
          impianto: {
            include: {
              cliente: true,
            },
          },
        },
      },
    },
  });

  console.log(`Servizi trovati: ${servizi.length}`);

  for (const s of servizi) {
    await prisma.servizioContratto.update({
      where: { id: s.id },
      data: { ra: true },
    });

    console.log(
      `Impostato RA=true su servizio "${s.nome}" (contratto ${
        s.contratto.numero || s.contratto.id
      }, impianto ${s.contratto.impianto?.numeroImpianto || "-"}, cliente ${
        s.contratto.impianto?.cliente?.denominazione || "-"
      })`
    );
  }

  console.log("Operazione completata.");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
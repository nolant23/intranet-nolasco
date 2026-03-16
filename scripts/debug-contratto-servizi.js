// scripts/debug-contratto-servizi.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Sostituisci qui il numero di un contratto che vedi nella tabella "senza righe fatturabili"
const NUMERO_CONTRATTO = "25-000052";

async function main() {
  const c = await prisma.contratto.findFirst({
    where: { numero: NUMERO_CONTRATTO },
    include: { servizi: true, impianto: true },
  });

  if (!c) {
    console.log("Contratto non trovato");
    return;
  }

  console.log("Contratto:", c.numero, "Impianto:", c.impianto?.numeroImpianto);
  console.log("Servizi (valori raw):");
  for (const s of c.servizi) {
    console.log({
      id: s.id,
      nome: s.nome,
      importo: s.importo,
      typeofImporto: typeof s.importo,
      ra: s.ra,
      iva: s.iva,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
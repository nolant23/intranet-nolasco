const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const interventi = await prisma.intervento.findMany({
    select: { numeroRapportino: true },
  });

  const perAnno = new Map();

  for (const it of interventi) {
    if (!it.numeroRapportino) continue;
    const [numPart, yearPart] = String(it.numeroRapportino).split("/");
    const year = parseInt(yearPart || "0", 10);
    const num = parseInt(numPart || "0", 10);
    if (!year || !num) continue;
    if (!perAnno.has(year)) perAnno.set(year, new Set());
    perAnno.get(year).add(num);
  }

  const result = [];

  for (const [year, setNums] of perAnno.entries()) {
    const nums = Array.from(setNums).sort((a, b) => a - b);
    const max = nums[nums.length - 1];
    const missing = [];
    for (let i = 1; i <= max; i++) {
      if (!setNums.has(i)) missing.push(i);
    }
    result.push({ year, max, missing });
  }

  result.sort((a, b) => a.year - b.year);

  for (const r of result) {
    console.log(`Anno ${r.year} (max ${r.max}):`);
    if (r.missing.length === 0) {
      console.log("  Nessuna bolla mancante.");
    } else {
      console.log("  Mancano i numeri:", r.missing.join(", "));
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


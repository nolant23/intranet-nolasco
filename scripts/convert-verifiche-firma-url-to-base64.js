/**
 * (Script one-time già eseguito) Converte le firme cliente da URL a base64
 * per le verifiche biennali esistenti. La colonna firmaClienteUrl è stata rimossa
 * dallo schema; non rieseguire senza ripristinarla.
 * Uso: node scripts/convert-verifiche-firma-url-to-base64.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function urlToBase64DataUrl(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn("Fetch fallito:", url?.slice(0, 50), e.message);
    return null;
  }
}

async function main() {
  const rows = await prisma.verificaBiennale.findMany({
    where: {
      firmaClienteUrl: { not: null },
      firmaClienteUrl: { not: "" },
    },
    select: { id: true, firmaClienteUrl: true },
  });

  console.log("Righe con firmaClienteUrl da convertire:", rows.length);

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const base64 = await urlToBase64DataUrl(row.firmaClienteUrl);
    if (base64) {
      await prisma.verificaBiennale.update({
        where: { id: row.id },
        data: { firmaCliente: base64, firmaClienteUrl: null },
      });
      ok++;
      if (ok % 10 === 0) console.log("Convertite", ok, "...");
    } else {
      fail++;
    }
  }

  console.log("Fine. Convertite:", ok, "Fallite:", fail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

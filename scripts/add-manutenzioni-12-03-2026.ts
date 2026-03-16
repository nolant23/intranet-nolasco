/**
 * Aggiunge le due manutenzioni del 12/03/2026 dal CSV MAN_ELENCO MANUTENZIONI.
 * Crea i record, genera i rapportini PDF e li carica su Supabase Storage.
 *
 * Eseguire dalla root: npx tsx scripts/add-manutenzioni-12-03-2026.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateRapportinoPDF } from "../src/lib/rapportino-pdf/generate";
import { uploadPdfToSupabaseFromLocal } from "../src/lib/supabase-storage";
import { urlToBase64DataUrl } from "../src/lib/signature-utils";

const prisma = new PrismaClient();

const DATA_MANUTENZIONE = new Date("2026-03-12");

// Dati dalle righe CSV del 12/03/2026 (impianto, tecnico, cliente firmatario, ora, firme, semestrali)
const RECORDS: Array<{
  numeroImpianto: string;
  tecnicoName: string;
  clienteFirmatario: string;
  oraEsecuzione: string;
  firmaCliente?: string | null;
  firmaTecnico?: string | null;
  effettuaSemestrale?: boolean;
  efficienzaParacadute?: boolean | null;
  efficienzaLimitatoreVelocita?: boolean | null;
  efficienzaDispositiviSicurezza?: boolean | null;
  condizioneFuni?: string | null;
  condizioneIsolamentoImpianto?: string | null;
  efficienzaCollegamentiTerra?: boolean | null;
  condizioniAttacchiFuni?: string | null;
}> = [
  {
    numeroImpianto: "A23M3644",
    tecnicoName: "Gaetano Mauro",
    clienteFirmatario: "Alessandro Pirrello",
    oraEsecuzione: "13:01",
    firmaCliente: "https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/z6GyHR3GherO1sM1FoIQ/pub/MQhwo8r3TTyyafijZdVF.png",
    firmaTecnico: "https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/z6GyHR3GherO1sM1FoIQ/pub/gLWOEmwcE0CPCrVHvxlV.png",
  },
  {
    numeroImpianto: "A25M0223",
    tecnicoName: "Michele Russo",
    clienteFirmatario: "Costa",
    oraEsecuzione: "13:22",
    firmaCliente: "https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/z6GyHR3GherO1sM1FoIQ/pub/un3INANN4RFu5mgtBUZh.png",
    firmaTecnico: "https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/z6GyHR3GherO1sM1FoIQ/pub/72xJQrKU189eHaRFtowg.png",
    effettuaSemestrale: true,
    efficienzaParacadute: true,
    efficienzaLimitatoreVelocita: null,
    efficienzaDispositiviSicurezza: true,
    condizioneFuni: "Discrete",
    condizioneIsolamentoImpianto: "Buono",
    efficienzaCollegamentiTerra: true,
    condizioniAttacchiFuni: "Buoni",
  },
];

async function main() {
  for (const r of RECORDS) {
    // Converti eventuali firme da URL a base64 (per import CSV)
    let firmaCliente = r.firmaCliente ?? null;
    let firmaTecnico = r.firmaTecnico ?? null;
    if (firmaCliente && firmaCliente.startsWith("http")) {
      const dataUrl = await urlToBase64DataUrl(firmaCliente);
      firmaCliente = dataUrl ?? firmaCliente;
    }
    if (firmaTecnico && firmaTecnico.startsWith("http")) {
      const dataUrl = await urlToBase64DataUrl(firmaTecnico);
      firmaTecnico = dataUrl ?? firmaTecnico;
    }

    const impianto = await prisma.impianto.findFirst({
      where: { numeroImpianto: r.numeroImpianto },
    });
    if (!impianto) {
      console.error(`Impianto non trovato: ${r.numeroImpianto}. Salto.`);
      continue;
    }

    const tecnico = await prisma.user.findFirst({
      where: {
        role: "TECNICO",
        name: { equals: r.tecnicoName, mode: "insensitive" },
      },
    });
    if (!tecnico) {
      console.error(`Tecnico non trovato: "${r.tecnicoName}". Salto.`);
      continue;
    }

    const dayStart = new Date(DATA_MANUTENZIONE.getFullYear(), DATA_MANUTENZIONE.getMonth(), DATA_MANUTENZIONE.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const existing = await prisma.manutenzione.findFirst({
      where: {
        impiantoId: impianto.id,
        dataManutenzione: { gte: dayStart, lt: dayEnd },
        tecnicoId: tecnico.id,
      },
    });
    if (existing) {
      const hasFirme = firmaCliente != null || firmaTecnico != null;
      const hasSemestrali =
        r.effettuaSemestrale != null ||
        r.efficienzaParacadute != null ||
        r.efficienzaLimitatoreVelocita != null ||
        r.efficienzaDispositiviSicurezza != null ||
        r.condizioneFuni != null ||
        r.condizioneIsolamentoImpianto != null ||
        r.efficienzaCollegamentiTerra != null ||
        r.condizioniAttacchiFuni != null;
      if (hasFirme || hasSemestrali) {
        await prisma.manutenzione.update({
          where: { id: existing.id },
          data: {
            ...(firmaCliente != null && { firmaCliente }),
            ...(firmaTecnico != null && { firmaTecnico }),
            ...(r.effettuaSemestrale != null && { effettuaSemestrale: r.effettuaSemestrale }),
            ...(r.efficienzaParacadute != null && { efficienzaParacadute: r.efficienzaParacadute }),
            ...(r.efficienzaLimitatoreVelocita !== undefined && { efficienzaLimitatoreVelocita: r.efficienzaLimitatoreVelocita }),
            ...(r.efficienzaDispositiviSicurezza != null && { efficienzaDispositiviSicurezza: r.efficienzaDispositiviSicurezza }),
            ...(r.condizioneFuni != null && { condizioneFuni: r.condizioneFuni }),
            ...(r.condizioneIsolamentoImpianto != null && { condizioneIsolamentoImpianto: r.condizioneIsolamentoImpianto }),
            ...(r.efficienzaCollegamentiTerra != null && { efficienzaCollegamentiTerra: r.efficienzaCollegamentiTerra }),
            ...(r.condizioniAttacchiFuni != null && { condizioniAttacchiFuni: r.condizioniAttacchiFuni }),
          },
        });
        const parts = [];
        if (hasFirme) parts.push("firme");
        if (hasSemestrali) parts.push("semestrali");
        console.log(`Manutenzione già presente: ${r.numeroImpianto} ${r.oraEsecuzione}. Aggiornati ${parts.join(" e ")}. Rigenero il rapportino...`);
        const fullExisting = await prisma.manutenzione.findUnique({
          where: { id: existing.id },
          include: { impianto: { include: { cliente: true } }, tecnico: true },
        });
        if (fullExisting) {
          const pdfPath = await generateRapportinoPDF(fullExisting);
          if (pdfPath) {
            const objectName = `Rapportino_${existing.id}.pdf`;
            const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
            if (supabaseUrl) {
              await prisma.manutenzione.update({
                where: { id: existing.id },
                data: { rapportinoPdf: supabaseUrl },
              });
              console.log(`  Rapportino caricato su Supabase.`);
            }
          }
        }
      } else {
        console.log(`Manutenzione già presente: ${r.numeroImpianto} ${r.oraEsecuzione}. Salto.`);
      }
      continue;
    }

    const dataManutenzione = new Date(DATA_MANUTENZIONE);
    const [h, m] = r.oraEsecuzione.split(":").map(Number);
    if (!isNaN(h)) dataManutenzione.setHours(h, isNaN(m) ? 0 : m, 0, 0);

    const created = await prisma.manutenzione.create({
      data: {
        dataManutenzione,
        oraEsecuzione: r.oraEsecuzione,
        tecnicoId: tecnico.id,
        impiantoId: impianto.id,
        clienteFirmatario: r.clienteFirmatario.trim(),
        firmaCliente,
        firmaTecnico,
        effettuaSemestrale: r.effettuaSemestrale ?? false,
        efficienzaParacadute: r.efficienzaParacadute ?? null,
        efficienzaLimitatoreVelocita: r.efficienzaLimitatoreVelocita ?? null,
        efficienzaDispositiviSicurezza: r.efficienzaDispositiviSicurezza ?? null,
        condizioneFuni: r.condizioneFuni ?? null,
        condizioneIsolamentoImpianto: r.condizioneIsolamentoImpianto ?? null,
        efficienzaCollegamentiTerra: r.efficienzaCollegamentiTerra ?? null,
        condizioniAttacchiFuni: r.condizioniAttacchiFuni ?? null,
      },
    });

    console.log(`Creata manutenzione: ${r.numeroImpianto} ${r.clienteFirmatario} (${created.id})`);

    const full = await prisma.manutenzione.findUnique({
      where: { id: created.id },
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
    });
    if (full) {
      const pdfPath = await generateRapportinoPDF(full);
      if (pdfPath) {
        const objectName = `Rapportino_${created.id}.pdf`;
        const supabaseUrl = await uploadPdfToSupabaseFromLocal(pdfPath, objectName, "rapportini");
        if (supabaseUrl) {
          await prisma.manutenzione.update({
            where: { id: created.id },
            data: { rapportinoPdf: supabaseUrl },
          });
          console.log(`  Rapportino caricato su Supabase.`);
        } else {
          console.warn(`  Upload Supabase non disponibile; rapportino solo locale.`);
        }
      }
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

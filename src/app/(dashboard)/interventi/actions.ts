"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateInterventoPDF } from "@/lib/pdf";
import fs from "fs";
import path from "path";
import { uploadPdfToSupabaseFromLocal } from "@/lib/supabase-storage";

const DEFAULT_PAGE_SIZE = 25;

export async function getInterventi() {
  const interventi = await prisma.intervento.findMany({
    include: {
      impianto: {
        include: {
          cliente: true,
        },
      },
      tecnico: true,
    },
  });

  interventi.sort((a: any, b: any) => {
    const [numA, yearA] = String(a.numeroRapportino || "").split("/");
    const [numB, yearB] = String(b.numeroRapportino || "").split("/");
    const yA = parseInt(yearA || "0", 10);
    const yB = parseInt(yearB || "0", 10);
    if (yA !== yB) return yB - yA;
    const nA = parseInt(numA || "0", 10);
    const nB = parseInt(numB || "0", 10);
    return nB - nA;
  });

  return interventi;
}

export async function getInterventoById(id: string) {
  try {
    const intervento = await prisma.intervento.findUnique({
      where: { id },
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
    });
    if (!intervento) return { success: false, error: "Intervento non trovato" };
    return { success: true, data: intervento };
  } catch (error) {
    console.error("Errore recupero intervento:", error);
    return { success: false, error: "Errore durante il recupero" };
  }
}

export async function getInterventiPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const skip = (page - 1) * pageSize;
  const [raw, total] = await Promise.all([
    prisma.intervento.findMany({
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
      orderBy: { dataIntervento: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.intervento.count(),
  ]);
  const data = raw.sort((a: any, b: any) => {
    const [numA, yearA] = String(a.numeroRapportino || "").split("/");
    const [numB, yearB] = String(b.numeroRapportino || "").split("/");
    const yA = parseInt(yearA || "0", 10);
    const yB = parseInt(yearB || "0", 10);
    if (yA !== yB) return yB - yA;
    return parseInt(numB || "0", 10) - parseInt(numA || "0", 10);
  });
  return { data, total };
}

/** Archivio: interventi con data non nell'anno in corso */
export async function getInterventiArchivioPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const where = { dataIntervento: { lt: yearStart } };
  const skip = (page - 1) * pageSize;
  const [raw, total] = await Promise.all([
    prisma.intervento.findMany({
      where,
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
      orderBy: { dataIntervento: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.intervento.count({ where }),
  ]);
  const data = raw.sort((a: any, b: any) => {
    const [numA, yearA] = String(a.numeroRapportino || "").split("/");
    const [numB, yearB] = String(b.numeroRapportino || "").split("/");
    const yA = parseInt(yearA || "0", 10);
    const yB = parseInt(yearB || "0", 10);
    if (yA !== yB) return yB - yA;
    return parseInt(numB || "0", 10) - parseInt(numA || "0", 10);
  });
  return { data, total };
}

export async function getImpianti() {
  // Nessun filtro: mostra tutti gli impianti
  const impianti = await prisma.impianto.findMany({
    include: {
      cliente: true,
    },
    orderBy: [{ numeroImpianto: "asc" }],
  });

  return impianti;
}

export async function getTecnici() {
  return await prisma.user.findMany({
    where: { role: "TECNICO" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function saveIntervento(data: any) {
  try {
    let fotoPaths: string[] = [];

    // Gestione foto: il client ora invia una stringa JSON (per evitare array annidati enormi)
    let fotoArray: string[] = [];
    if (typeof data.foto === "string" && data.foto.trim().length > 0) {
      try {
        const parsed = JSON.parse(data.foto);
        if (Array.isArray(parsed)) {
          fotoArray = parsed;
        }
      } catch {
        // se il parse fallisce, ignoriamo le foto per sicurezza
        fotoArray = [];
      }
    } else if (Array.isArray(data.foto)) {
      // retrocompatibilità nel caso arrivasse ancora un array
      fotoArray = data.foto;
    }

    // Salvataggio fisico delle immagini
    if (fotoArray.length > 0) {
      const dirPath = path.join(process.cwd(), 'public', 'uploads', 'interventi');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      for (let i = 0; i < fotoArray.length; i++) {
        const fotoData = fotoArray[i];
        if (fotoData.startsWith('data:image')) {
          // E' una nuova immagine in base64
          const matches = fotoData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const fileName = `foto_${Date.now()}_${i}.${ext}`;
            const filePath = path.join(dirPath, fileName);
            fs.writeFileSync(filePath, buffer);
            fotoPaths.push(`/uploads/interventi/${fileName}`);
          }
        } else {
          // E' un URL esistente
          fotoPaths.push(fotoData);
        }
      }
    }

    const fotoJson = JSON.stringify(fotoPaths);

    let savedIntervento;
    if (data.id) {
      savedIntervento = await prisma.intervento.update({
        where: { id: data.id },
        data: {
          dataIntervento: new Date(data.dataIntervento),
          oraInizio: data.oraInizio,
          oraFine: data.oraFine,
          tecnicoId: data.tecnicoId,
          impiantoId: data.impiantoId,
          descrizione: data.descrizione,
          partiSostituite: data.partiSostituite,
          materialeOrdinare: data.materialeOrdinare,
          foto: fotoJson,
          clienteFirmatario: data.clienteFirmatario,
          firmaTecnico: data.firmaTecnico,
          firmaCliente: data.firmaCliente,
        },
      });
    } else {
      const currentYear = new Date().getFullYear();
      const firstDayOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      const lastDayOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

      const lastIntervento = await prisma.intervento.findFirst({
        where: {
          createdAt: {
            gte: firstDayOfYear,
            lte: lastDayOfYear,
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      let nextNumber = 1;
      if (lastIntervento && lastIntervento.numeroRapportino) {
        const parts = lastIntervento.numeroRapportino.split('/');
        if (parts.length === 2 && !isNaN(parseInt(parts[0], 10))) {
          nextNumber = parseInt(parts[0], 10) + 1;
        }
      }

      const generatedNumeroRapportino = `${String(nextNumber).padStart(3, '0')}/${currentYear}`;

      savedIntervento = await prisma.intervento.create({
        data: {
          numeroRapportino: generatedNumeroRapportino,
          dataIntervento: new Date(data.dataIntervento),
          oraInizio: data.oraInizio,
          oraFine: data.oraFine,
          tecnicoId: data.tecnicoId,
          impiantoId: data.impiantoId,
          descrizione: data.descrizione,
          partiSostituite: data.partiSostituite,
          materialeOrdinare: data.materialeOrdinare,
          foto: fotoJson,
          clienteFirmatario: data.clienteFirmatario,
          firmaTecnico: data.firmaTecnico,
          firmaCliente: data.firmaCliente,
        },
      });
    }

    const fullIntervento = await prisma.intervento.findUnique({
      where: { id: savedIntervento.id },
      include: {
        tecnico: true,
        impianto: {
          include: {
            cliente: true,
          },
        },
      },
    });

    if (fullIntervento) {
      const pdfPath = await generateInterventoPDF(fullIntervento);
      if (pdfPath) {
        // Carica il PDF generato su Supabase Storage per avere un link permanente
        const supabaseUrl = await uploadPdfToSupabaseFromLocal(
          pdfPath,
          `Intervento_${savedIntervento.id}.pdf`
        );

        const finalUrl = supabaseUrl ?? pdfPath;

        await prisma.intervento.update({
          where: { id: savedIntervento.id },
          data: { rapportinoPdf: finalUrl },
        });
      }
    }

    revalidatePath("/interventi");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio intervento:", error);
    return { success: false, error: "Errore durante il salvataggio dell'intervento" };
  }
}

export async function deleteIntervento(id: string) {
  try {
    await prisma.intervento.delete({ where: { id } });
    revalidatePath("/interventi");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione intervento:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

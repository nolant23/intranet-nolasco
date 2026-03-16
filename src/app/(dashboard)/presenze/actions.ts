"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { generatePresenzePDF } from "@/lib/pdf";

// Calcola Pasqua e Pasquetta
function getPasquetta(year: number): Date {
  const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
  
  const pasqua = new Date(year, month - 1, day);
  // Pasquetta è il giorno dopo
  const pasquetta = new Date(pasqua);
  pasquetta.setDate(pasqua.getDate() + 1);
  return pasquetta;
}

function isFestivo(date: Date): boolean {
  const day = date.getDay();
  // Domenica = 0, Sabato = 6
  if (day === 0 || day === 6) return true;

  const d = date.getDate();
  const m = date.getMonth() + 1; // 1-12
  const y = date.getFullYear();

  // Feste fisse italiane + 19 Marzo
  const festeFisse = [
    "1-1",   // Capodanno
    "6-1",   // Epifania
    "19-3",  // S. Giuseppe (Festa aziendale)
    "25-4",  // Liberazione
    "1-5",   // Lavoratori
    "2-6",   // Repubblica
    "15-8",  // Ferragosto
    "1-11",  // Tutti i Santi
    "8-12",  // Immacolata
    "25-12", // Natale
    "26-12", // S. Stefano
  ];

  if (festeFisse.includes(`${d}-${m}`)) return true;

  const pasquetta = getPasquetta(y);
  if (d === pasquetta.getDate() && m === pasquetta.getMonth() + 1) return true;

  return false;
}

export async function getPresenze(mese: number, anno: number, tecnicoId?: string) {
  const startDate = new Date(anno, mese - 1, 1);
  const endDate = new Date(anno, mese, 0, 23, 59, 59, 999);

  const whereClause: any = {
    data: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (tecnicoId && tecnicoId !== "ALL") {
    whereClause.tecnicoId = tecnicoId;
  }

  return await prisma.presenza.findMany({
    where: whereClause,
    include: { tecnico: true },
    orderBy: [
      { data: "asc" },
      { tecnico: { name: "asc" } }
    ],
  });
}

export async function getTecnici() {
  return await prisma.user.findMany({
    where: { role: "TECNICO" },
    orderBy: { name: "asc" }
  });
}

export async function generaPresenze(mese: number, anno: number) {
  try {
    const tecnici = await prisma.user.findMany({
      where: { role: "TECNICO" },
    });

    if (tecnici.length === 0) {
      return { success: false, error: "Nessun tecnico trovato." };
    }

    const daysInMonth = new Date(anno, mese, 0).getDate();
    
    // Preparo i record da inserire/aggiornare
    for (const tecnico of tecnici) {
      for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(anno, mese - 1, d, 12, 0, 0); // Mezzogiorno per evitare problemi di fuso
        
        // Se è sabato o domenica, non generiamo proprio il record
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const festivo = isFestivo(currentDate);

        const oreOrdinario = festivo ? 0 : 8;
        const oreFestivo = festivo ? 8 : 0;

        // Upsert per ogni giorno e ogni tecnico per evitare duplicati
        await prisma.presenza.upsert({
          where: {
            data_tecnicoId: {
              data: currentDate,
              tecnicoId: tecnico.id,
            }
          },
          update: {
            // Se esiste già, non forziamo la sovrascrittura se l'utente l'ha magari modificato manualmente,
            // oppure sì? La richiesta: "caricare in automatico tutte le presenze...".
            // Solitamente si sovrascrive tutto.
            oreOrdinario: oreOrdinario,
            orePermesso: 0,
            oreMalattia: 0,
            oreStraordinario: 0,
            oreFestivo: oreFestivo,
            oreFerie: 0,
          },
          create: {
            data: currentDate,
            tecnicoId: tecnico.id,
            oreOrdinario: oreOrdinario,
            orePermesso: 0,
            oreMalattia: 0,
            oreStraordinario: 0,
            oreFestivo: oreFestivo,
            oreFerie: 0,
          }
        });
      }
    }

    revalidatePath("/presenze");
    return { success: true };
  } catch (error) {
    console.error("Errore generazione presenze:", error);
    return { success: false, error: "Errore durante la generazione delle presenze" };
  }
}

export async function updatePresenza(id: string, data: any) {
  try {
    await prisma.presenza.update({
      where: { id },
      data: {
        oreOrdinario: parseFloat(data.oreOrdinario) || 0,
        orePermesso: parseFloat(data.orePermesso) || 0,
        oreMalattia: parseFloat(data.oreMalattia) || 0,
        oreStraordinario: parseFloat(data.oreStraordinario) || 0,
        oreFestivo: parseFloat(data.oreFestivo) || 0,
        oreFerie: parseFloat(data.oreFerie) || 0,
      }
    });
    revalidatePath("/presenze");
    return { success: true };
  } catch (error) {
    console.error("Errore aggiornamento presenza:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deletePresenza(id: string) {
  try {
    await prisma.presenza.delete({ where: { id } });
    revalidatePath("/presenze");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione presenza:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

export async function deletePresenzeMultiple(ids: string[]) {
  try {
    await prisma.presenza.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    revalidatePath("/presenze");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione presenze multiple:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

export async function exportPresenzePDF(mese: number, anno: number, tecnicoId?: string) {
  try {
    const startDate = new Date(anno, mese - 1, 1);
    const endDate = new Date(anno, mese, 0, 23, 59, 59, 999);

    const whereClause: any = {
      data: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (tecnicoId && tecnicoId !== "ALL") {
      whereClause.tecnicoId = tecnicoId;
    }

    const presenze = await prisma.presenza.findMany({
      where: whereClause,
      include: { tecnico: true },
      orderBy: [
        { tecnicoId: "asc" },
        { data: "asc" }
      ],
    });

    if (presenze.length === 0) {
      return { success: false, error: "Nessuna presenza trovata nel periodo per l'esportazione" };
    }

    const pdfUrl = await generatePresenzePDF(presenze, mese, anno);
    if (!pdfUrl) {
      return { success: false, error: "Errore durante la generazione del PDF" };
    }

    return { success: true, url: pdfUrl };
  } catch (error) {
    console.error("Errore esportazione PDF:", error);
    return { success: false, error: "Errore durante l'esportazione" };
  }
}

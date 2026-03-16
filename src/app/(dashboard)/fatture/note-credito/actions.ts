"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { uploadPdfToSupabaseFromLocal } from "@/lib/supabase-storage";

/** True se abbiamo già un PDF memorizzato (locale o Supabase). */
function hasStoredPdf(urlDocumento: string | null): boolean {
  if (!urlDocumento) return false;
  if (urlDocumento.startsWith("/uploads/")) return true;
  if (urlDocumento.includes("/storage/v1/object/")) return true;
  return false;
}

async function downloadAndSavePdf(url: string, ficId: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "note-credito");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `nota_credito_${ficId}.pdf`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const localPath = `/uploads/note-credito/${filename}`;
    const supabaseUrl = await uploadPdfToSupabaseFromLocal(localPath, filename, "note-credito");
    return supabaseUrl ?? localPath;
  } catch (error) {
    console.error(`Errore nel download del PDF per nota di credito ${ficId}:`, error);
    return null;
  }
}

export async function getNoteCredito(year?: number) {
  try {
    const whereClause = year ? {
      data: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    } : {};

    const note = await prisma.notaCredito.findMany({
      where: whereClause,
      include: {
        fattura: true
      },
      orderBy: { data: 'desc' }
    });
    
    return note.sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, '')) || 0;
      
      if (numA !== numB) {
        return numB - numA;
      }
      return b.data.getTime() - a.data.getTime();
    });
  } catch (error) {
    console.error("Errore recupero note di credito dal DB:", error);
    return [];
  }
}

/** Archivio: solo note di credito con data antecedente all'anno in corso */
export async function getNoteCreditoArchivio() {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    const note = await prisma.notaCredito.findMany({
      where: { data: { lt: yearStart } },
      include: { fattura: true },
      orderBy: { data: 'desc' },
    });
    return note.sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      return b.data.getTime() - a.data.getTime();
    });
  } catch (error) {
    console.error("Errore recupero note di credito archivio:", error);
    return [];
  }
}

export async function getNotaCreditoById(id: string) {
  try {
    const nota = await prisma.notaCredito.findUnique({
      where: { id },
      include: { fattura: true },
    });
    if (!nota) return { success: false, error: "Nota di credito non trovata" };
    return { success: true, data: nota };
  } catch (error) {
    console.error("Errore recupero nota di credito:", error);
    return { success: false, error: "Errore durante il recupero" };
  }
}

export async function fetchNoteCreditoInCloudList(year?: number) {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate" };
    }

    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const cleanToken = accessToken.replace(/^Bearer\s+/i, '');

    let allDocuments: any[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents?type=credit_note&fieldset=detailed&per_page=50&page=${currentPage}&q=date >= '${startDate}' AND date <= '${endDate}'`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Errore chiamata API: ${response.statusText}` };
      }

      const json = await response.json();
      
      if (json.data && Array.isArray(json.data)) {
        allDocuments = allDocuments.concat(json.data);
      }
      
      lastPage = json.last_page || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return { success: true, documents: allDocuments };
  } catch (error: any) {
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function processaBatchNoteCredito(documents: any[]) {
  try {
    const existingNote = await prisma.notaCredito.findMany({ select: { ficId: true, urlDocumento: true }});
    const existingMap = new Map(existingNote.map(f => [f.ficId, f.urlDocumento]));

    for (const doc of documents) {
      const ficId = String(doc.id);
      const numero = doc.number ? String(doc.number) : ""; 
      const dataDoc = doc.date ? new Date(doc.date) : new Date();
      
      const clienteNome = doc.entity?.name || "";
      const clienteFicId = doc.entity?.id != null ? String(doc.entity.id) : null;
      const clientePartitaIva = doc.entity?.vat_number || null;
      const clienteCodiceFiscale = doc.entity?.tax_code || null;
      
      const oggetto = doc.subject || null;
      const note = doc.notes || null;
      const importoNetto = doc.amount_net || 0;
      
      let importoIva = doc.amount_vat || doc.amount_tax || 0;
      if (importoIva === 0 && doc.amount_gross && doc.amount_net) {
        importoIva = doc.amount_gross - doc.amount_net;
      }
      
      const importoTotale = doc.amount_gross || 0;
      
      let urlDocumento = existingMap.get(ficId) || null;

      if (doc.url && !hasStoredPdf(urlDocumento)) {
        const storedPath = await downloadAndSavePdf(doc.url, ficId);
        if (storedPath) {
          urlDocumento = storedPath;
        } else if (!urlDocumento) {
          urlDocumento = doc.url;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      // Try to find the related invoice
      let fatturaId: string | null = null;
      let targetFatturaNumber: string | null = null;
      let targetFatturaYear: number | null = null;
      let targetFatturaDate: string | null = null;

      // Extract invoice number from e-invoice data if available
      // Nel JSON dettagliato di FiC per le note di credito abbiamo:
      // "ei_data": { "invoice_number": "145", "invoice_date": "2026-02-10", ... }
      if (doc.ei_data) {
        if (doc.ei_data.invoice_number) {
          targetFatturaNumber = String(doc.ei_data.invoice_number).trim();
        }
        if (doc.ei_data.invoice_date) {
          // Salviamo sia l'anno che la data completa (YYYY-MM-DD)
          targetFatturaDate = String(doc.ei_data.invoice_date).slice(0, 10);
          targetFatturaYear = new Date(doc.ei_data.invoice_date).getFullYear();
        }
      }
      
      // Fallback per vecchie versioni o altri formati API (campo e_invoice_data usato in altri contesti)
      if (!targetFatturaNumber && doc.e_invoice_data && doc.e_invoice_data.invoice_number) {
        targetFatturaNumber = String(doc.e_invoice_data.invoice_number).trim();
        if (doc.e_invoice_data.invoice_date) {
          targetFatturaDate = String(doc.e_invoice_data.invoice_date).slice(0, 10);
          targetFatturaYear = new Date(doc.e_invoice_data.invoice_date).getFullYear();
        }
      }
      
      // Fallback: proviamo a cercarlo come stringa nell'oggetto o nelle note
      if (!targetFatturaNumber) {
        const combinedText = `${oggetto || ''} ${note || ''}`.toLowerCase();
        const possibleFatture = await prisma.fattura.findMany({
          where: { clienteNome }
        });
        
        for (const f of possibleFatture) {
          const numStr = f.numero.toLowerCase();
          if (combinedText.includes(numStr) || combinedText.includes(`fattura ${numStr}`)) {
            fatturaId = f.id;
            break;
          }
        }
      }

      // Se abbiamo trovato il numero e la data della fattura nei dati e_invoice, cerchiamola nel DB
      if (targetFatturaNumber && !fatturaId) {
        const possibleFatture = await prisma.fattura.findMany({
          where: { clienteNome }
        });
        
        for (const f of possibleFatture) {
          const numFatturaDb = String(f.numero).trim().toLowerCase();
          const numTarget = String(targetFatturaNumber).trim().toLowerCase();
          
          let dateMatch = true;
          if (targetFatturaDate) {
            const fatturaDateStr = f.data.toISOString().slice(0, 10);
            if (fatturaDateStr !== targetFatturaDate) {
              dateMatch = false;
            }
          } else if (targetFatturaYear) {
            const fYear = new Date(f.data).getFullYear();
            if (fYear !== targetFatturaYear) {
              dateMatch = false;
            }
          }
          
          // Controlliamo che il numero corrisponda (es. "5" con "5/A", "5" con "5") e la data combaci
          if (dateMatch && (numFatturaDb === numTarget || numFatturaDb.startsWith(`${numTarget}/`) || numFatturaDb.endsWith(`/${numTarget}`))) {
            fatturaId = f.id;
            break;
          }
        }
        
        // Se non trovato per cliente esatto (magari c'è una discordanza di nome), prova su tutto il db
        if (!fatturaId) {
          const allFatture = await prisma.fattura.findMany();
          for (const f of allFatture) {
            const numFatturaDb = String(f.numero).trim().toLowerCase();
            const numTarget = String(targetFatturaNumber).trim().toLowerCase();
            
            let dateMatch = true;
            if (targetFatturaDate) {
              const fatturaDateStr = f.data.toISOString().slice(0, 10);
              if (fatturaDateStr !== targetFatturaDate) {
                dateMatch = false;
              }
            } else if (targetFatturaYear) {
              const fYear = new Date(f.data).getFullYear();
              if (fYear !== targetFatturaYear) {
                dateMatch = false;
              }
            }
            
            if (dateMatch && (numFatturaDb === numTarget || numFatturaDb.startsWith(`${numTarget}/`) || numFatturaDb.endsWith(`/${numTarget}`))) {
              fatturaId = f.id;
              break;
            }
          }
        }
      }

      // Se ancora non è stata trovata, riproviamo cercando in stringhe grezze da FiC (come reference_number se presente, per legacy)
      if (!fatturaId && doc.e_invoice === false) {
          // just fallback
      }

      const cliente = clienteFicId
        ? await prisma.cliente.findUnique({ where: { ficId: clienteFicId }, select: { id: true } })
        : null;

      const nota = await prisma.notaCredito.upsert({
        where: { ficId: ficId },
        update: {
          numero,
          data: dataDoc,
          clienteNome,
          clientePartitaIva,
          clienteCodiceFiscale,
          oggetto,
          note,
          importoNetto,
          importoIva,
          importoTotale,
          urlDocumento,
          fatturaId,
          clienteFicId,
          clienteId: cliente?.id || null
        },
        create: {
          ficId,
          numero,
          data: dataDoc,
          clienteNome,
          clientePartitaIva,
          clienteCodiceFiscale,
          oggetto,
          note,
          importoNetto,
          importoIva,
          importoTotale,
          urlDocumento,
          fatturaId,
          clienteFicId,
          clienteId: cliente?.id || null
        }
      });
      
      // Se abbiamo trovato la fattura, aggiorniamo il suo stato considerando TUTTE le note di credito collegate
      if (fatturaId) {
        const fattura = await prisma.fattura.findUnique({ where: { id: fatturaId } });
        if (fattura) {
          // Somma assoluta di tutte le note di credito collegate a questa fattura
          const agg = await prisma.notaCredito.aggregate({
            where: { fatturaId },
            _sum: { importoTotale: true },
          });

          const totaleNote = Math.abs(agg._sum.importoTotale || 0);
          const totaleFattura = fattura.importoTotale;

          let nuovoStato = fattura.stato;

          // Se l'importo complessivo stornato copre (con una piccola tolleranza) l'intera fattura, è STORNATA
          if (totaleNote >= totaleFattura - 0.01) {
            nuovoStato = "STORNATO";
          } else if (totaleNote > 0 && fattura.stato !== "SALDATO") {
            nuovoStato = "PARZ. STORNATO";
          }

          if (nuovoStato !== fattura.stato) {
            await prisma.fattura.update({
              where: { id: fatturaId },
              data: { stato: nuovoStato },
            });
          }
        }
      }
    }

    revalidatePath("/fatture");
    revalidatePath("/fatture/note-credito");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

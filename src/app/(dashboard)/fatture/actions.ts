"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { generaFattureContrattiPerMese } from "@/app/(dashboard)/contratti/actions";
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

    const uploadDir = path.join(process.cwd(), "public", "uploads", "fatture");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `fattura_${ficId}.pdf`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const localPath = `/uploads/fatture/${filename}`;
    const supabaseUrl = await uploadPdfToSupabaseFromLocal(localPath, filename, "fatture");
    return supabaseUrl ?? localPath;
  } catch (error) {
    console.error(`Errore nel download del PDF per fattura ${ficId}:`, error);
    return null;
  }
}

const DEFAULT_PAGE_SIZE = 25;

export async function getFatture(year?: number) {
  try {
    const whereClause = year ? {
      data: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    } : {};

    const fatture = await prisma.fattura.findMany({
      where: whereClause,
      orderBy: { data: 'desc' },
      include: {
        noteCredito: true,
      },
    });
    
    // Ordina in memoria convertendo il numero in intero per gestire correttamente 1, 2, 10
    return fatture.sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      return b.data.getTime() - a.data.getTime();
    });
  } catch (error) {
    console.error("Errore recupero fatture dal DB:", error);
    return [];
  }
}

export async function getFatturePaginated(year: number, page: number, pageSize: number = DEFAULT_PAGE_SIZE) {
  try {
    const where = {
      data: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    };
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      prisma.fattura.findMany({
        where,
        orderBy: { data: "desc" },
        include: { noteCredito: true },
        skip,
        take: pageSize,
      }),
      prisma.fattura.count({ where }),
    ]);
    const sorted = [...data].sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, "")) || 0;
      if (numA !== numB) return numB - numA;
      return b.data.getTime() - a.data.getTime();
    });
    return { data: sorted, total };
  } catch (error) {
    console.error("Errore getFatturePaginated:", error);
    return { data: [], total: 0 };
  }
}

/** Archivio: solo fatture non dell'anno in corso. year null = tutti gli anni passati (escluso anno corrente) */
export async function getFattureArchivioPaginated(
  year: number | null,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    const where = year != null
      ? {
          data: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        }
      : { data: { lt: yearStart, gte: new Date("2020-01-01T00:00:00.000Z") } };
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      prisma.fattura.findMany({
        where,
        orderBy: { data: "desc" },
        include: { noteCredito: true },
        skip,
        take: pageSize,
      }),
      prisma.fattura.count({ where }),
    ]);
    const sorted = [...data].sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, "")) || 0;
      if (numA !== numB) return numB - numA;
      return b.data.getTime() - a.data.getTime();
    });
    return { data: sorted, total };
  } catch (error) {
    console.error("Errore getFattureArchivioPaginated:", error);
    return { data: [], total: 0 };
  }
}

export async function getFatturaById(id: string) {
  try {
    const fattura = await prisma.fattura.findUnique({
      where: { id },
      include: {
        noteCredito: true,
      },
    });
    if (!fattura) return { success: false, error: "Fattura non trovata" };
    return { success: true, data: fattura };
  } catch (error) {
    console.error("Errore recupero fattura:", error);
    return { success: false, error: "Errore durante il recupero della fattura" };
  }
}

export async function getFatturaByFicId(ficId: string) {
  try {
    const fattura = await prisma.fattura.findUnique({
      where: { ficId },
      include: {
        noteCredito: true,
      },
    });
    if (!fattura) return { success: false, error: "Fattura non trovata" };
    return { success: true, data: fattura };
  } catch (error) {
    console.error("Errore recupero fattura per ficId:", error);
    return { success: false, error: "Errore durante il recupero della fattura" };
  }
}

export async function fetchFattureInCloudList(year?: number) {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate (verifica file .env)" };
    }

    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const cleanToken = accessToken.replace(/^Bearer\s+/i, '');

    let allDocuments: any[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents?type=invoice&fieldset=detailed&per_page=50&page=${currentPage}&q=date >= '${startDate}' AND date <= '${endDate}'`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Errore API FiC:", errorText);
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
    console.error("Errore fetch lista Fatture in Cloud:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function processaBatchFatture(documents: any[]) {
  try {
    let countUpdated = 0;
    const existingFatture = await prisma.fattura.findMany({ select: { ficId: true, urlDocumento: true }});
    const existingMap = new Map(existingFatture.map(f => [f.ficId, f.urlDocumento]));

    // Recuperiamo tutti gli impianti con numeroImpianto e cliente collegato,
    // serviranno per collegare le fatture ai clienti tramite numero impianto nell'oggetto.
    const impianti = await prisma.impianto.findMany({
      select: {
        id: true,
        numeroImpianto: true,
        clienteId: true,
      },
      where: {
        numeroImpianto: { not: null },
      },
    });

    for (const doc of documents) {
      // Map relevant fields
      const ficId = String(doc.id);
      const tipoDocumento = doc.type || null;
      const numero = doc.number ? String(doc.number) : ""; // Convert number to string
      const dataDoc = doc.date ? new Date(doc.date) : new Date();
      const dataScadenza = doc.next_due_date ? new Date(doc.next_due_date) : null;
      
      const clienteNome = doc.entity?.name || "";
      const clienteFicId = doc.entity?.id != null ? String(doc.entity.id) : null;
      const clientePartitaIva = doc.entity?.vat_number || null;
      const clienteCodiceFiscale = doc.entity?.tax_code || null;
      
      const parts = [
        doc.entity?.address_street,
        doc.entity?.address_postal_code,
        doc.entity?.address_city,
        doc.entity?.address_province
      ].filter(Boolean);
      const clienteIndirizzo = parts.length > 0 ? parts.join(", ") : null;
      
      const oggetto = doc.subject || null;
      const note = doc.notes || null;
      const importoNetto = doc.amount_net || 0;
      const importoRA = doc.amount_withholding_tax || 0;
      
      // In Fatture in Cloud, IVA (tax) could be nested in items or in amount_tax.
      // Often, the tax is amount_vat or amount_tax, but we can also simply subtract if amount_gross and amount_net are there
      let importoIva = doc.amount_vat || doc.amount_tax || 0;
      if (importoIva === 0 && doc.amount_gross && doc.amount_net) {
        importoIva = doc.amount_gross - doc.amount_net;
      }
      
      const importoTotale = doc.amount_gross || 0;
      
      const metodoPagamento = doc.payment_method?.name || null;
      const statoFatturaElettronica = doc.e_invoice_status || null;
      
      const articoliJson = doc.items_list ? JSON.stringify(doc.items_list) : null;
      const pagamentiJson = doc.payments_list ? JSON.stringify(doc.payments_list) : null;
      
      let urlDocumento = existingMap.get(ficId) || null;
      
      // Se NON abbiamo ancora un PDF memorizzato (locale o Supabase), lo scarichiamo e carichiamo su Supabase.
      if (doc.url && !hasStoredPdf(urlDocumento)) {
        const storedPath = await downloadAndSavePdf(doc.url, ficId);
        if (storedPath) {
          urlDocumento = storedPath;
        } else if (!urlDocumento) {
          urlDocumento = doc.url; // Fallback al link remoto temporaneo
        }
        // Pausa di 300ms solo se abbiamo effettivamente fatto un download, per non sovraccaricare l'API
        await new Promise(r => setTimeout(r, 300)); 
      }

      // Map status from FiC status / payments_list
      let stato = "NON SALDATO";

      // Compute paid / reversed amounts safely
      let totalPaid = 0;
      let totalReversed = 0;
      if (doc.payments_list && Array.isArray(doc.payments_list)) {
        for (const payment of doc.payments_list) {
          const amt = payment.amount || 0;
          if (payment.status === "paid") totalPaid += amt;
          if (payment.status === "reversed") totalReversed += amt;
        }
      }

      const gross = doc.amount_gross || 0;
      const eps = 0.01;

      // Se è totalmente stornata (da reversals), non deve risultare "da saldare"
      if (totalReversed >= gross - eps && gross > 0) {
        stato = "STORNATO";
      } else if (totalReversed > eps) {
        stato = "PARZ. STORNATO";
      } else if (doc.is_marked || totalPaid >= gross - eps) {
        stato = "SALDATO";
      } else if (totalPaid > eps) {
        stato = "PARZIALE";
      }

      // Collegamento cliente TRAMITE IMPIANTO:
      // cerchiamo il numero impianto nell'oggetto/note della fattura
      let clienteIdPerImpianto: string | null = null;
      if (oggetto || note) {
        const text = `${oggetto || ""} ${note || ""}`.toLowerCase();
        for (const imp of impianti) {
          if (!imp.numeroImpianto || !imp.clienteId) continue;
          const code = String(imp.numeroImpianto).toLowerCase();
          if (code && text.includes(code)) {
            clienteIdPerImpianto = imp.clienteId;
            break;
          }
        }
      }

      await prisma.fattura.upsert({
        where: { ficId: ficId },
        update: {
          tipoDocumento,
          numero,
          data: dataDoc,
          dataScadenza,
          clienteNome,
          clienteFicId,
          // importiamo comunque il ficId ma NON usiamo più il collegamento diretto cliente-ficId.
          // Il cliente viene collegato tramite l'impianto trovato nell'oggetto.
          clienteId: clienteIdPerImpianto,
          clientePartitaIva,
          clienteCodiceFiscale,
          clienteIndirizzo,
          oggetto,
          note,
          importoNetto,
          importoIva,
          importoRA,
          importoTotale,
          stato,
          metodoPagamento,
          statoFatturaElettronica,
          articoliJson,
          pagamentiJson,
          urlDocumento
        },
        create: {
          ficId,
          tipoDocumento,
          numero,
          data: dataDoc,
          dataScadenza,
          clienteNome,
          clienteFicId,
          clienteId: clienteIdPerImpianto,
          clientePartitaIva,
          clienteCodiceFiscale,
          clienteIndirizzo,
          oggetto,
          note,
          importoNetto,
          importoIva,
          importoRA,
          importoTotale,
          stato,
          metodoPagamento,
          statoFatturaElettronica,
          articoliJson,
          pagamentiJson,
          urlDocumento
        }
      });
      
      countUpdated++; // Simply counting processed for now
    }

    revalidatePath("/fatture");
    return { success: true, message: `Batch processato.` };
  } catch (error: any) {
    console.error("Errore elaborazione batch:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function generaFattureAutomatichePerMese(
  year?: number,
  month?: number
) {
  const res = await generaFattureContrattiPerMese(year, month);
  revalidatePath("/fatturazione");
  // Potremmo anche revalidare /fatture per vedere subito le nuove fatture
  revalidatePath("/fatture");
  return res;
}

export async function updateFattura(id: string, data: { oggetto?: string | null; note?: string | null }) {
  try {
    const updated = await prisma.fattura.update({
      where: { id },
      data: {
        oggetto: data.oggetto ?? null,
        note: data.note ?? null,
      },
    });
    revalidatePath("/fatture");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Errore aggiornamento fattura:", error);
    return { success: false, error: "Errore durante l'aggiornamento della fattura" };
  }
}

export async function sincronizzaSingolaFattura(ficId: string) {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate" };
    }

    const cleanToken = accessToken.replace(/^Bearer\s+/i, '');
    const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents/${ficId}?fieldset=detailed`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Errore API FiC Singola Fattura:", errorText);
      return { success: false, error: `Errore chiamata API: ${response.statusText}` };
    }

    const json = await response.json();
    const doc = json.data;

    if (!doc) {
      return { success: false, error: "Documento non trovato su Fatture in Cloud" };
    }

    // Map relevant fields
    const tipoDocumento = doc.type || null;
    const numero = doc.number ? String(doc.number) : ""; 
    const dataDoc = doc.date ? new Date(doc.date) : new Date();
    const dataScadenza = doc.next_due_date ? new Date(doc.next_due_date) : null;
    
    const clienteNome = doc.entity?.name || "";
    const clienteFicId = doc.entity?.id != null ? String(doc.entity.id) : null;
    const clientePartitaIva = doc.entity?.vat_number || null;
    const clienteCodiceFiscale = doc.entity?.tax_code || null;
    
    const parts = [
      doc.entity?.address_street,
      doc.entity?.address_postal_code,
      doc.entity?.address_city,
      doc.entity?.address_province
    ].filter(Boolean);
    const clienteIndirizzo = parts.length > 0 ? parts.join(", ") : null;
    
    const oggetto = doc.subject || null;
    const note = doc.notes || null;
    const importoNetto = doc.amount_net || 0;
    const importoRA = doc.amount_withholding_tax || 0;
    
    let importoIva = doc.amount_vat || doc.amount_tax || 0;
    if (importoIva === 0 && doc.amount_gross && doc.amount_net) {
      importoIva = doc.amount_gross - doc.amount_net;
    }
    
    const importoTotale = doc.amount_gross || 0;
    
    const metodoPagamento = doc.payment_method?.name || null;
    // Se FiC non restituisce uno stato elettronico ma stiamo sincronizzando manualmente,
    // consideriamo comunque la fattura come "inviata" e forziamo "sent".
    const statoFatturaElettronicaRaw = doc.e_invoice_status || null;
    const statoFatturaElettronica =
      statoFatturaElettronicaRaw && String(statoFatturaElettronicaRaw).trim() !== ""
        ? String(statoFatturaElettronicaRaw)
        : "sent";
    
    const articoliJson = doc.items_list ? JSON.stringify(doc.items_list) : null;
    const pagamentiJson = doc.payments_list ? JSON.stringify(doc.payments_list) : null;
    
    // Recuperiamo il path esistente per non sovrascriverlo con un link temporaneo in caso di fallimento
    const existing = await prisma.fattura.findUnique({ where: { ficId }, select: { urlDocumento: true } });
    let urlDocumento = existing?.urlDocumento || null;

    if (doc.url) {
      const storedPath = await downloadAndSavePdf(doc.url, ficId);
      if (storedPath) {
        urlDocumento = storedPath;
      } else if (!urlDocumento) {
        urlDocumento = doc.url;
      }
    }

    let stato = "NON SALDATO";

    let totalPaid = 0;
    let totalReversed = 0;
    if (doc.payments_list && Array.isArray(doc.payments_list)) {
      for (const payment of doc.payments_list) {
        const amt = payment.amount || 0;
        if (payment.status === "paid") totalPaid += amt;
        if (payment.status === "reversed") totalReversed += amt;
      }
    }

    const gross = doc.amount_gross || 0;
    const eps = 0.01;

    if (totalReversed >= gross - eps && gross > 0) {
      stato = "STORNATO";
    } else if (totalReversed > eps) {
      stato = "PARZ. STORNATO";
    } else if (doc.is_marked || totalPaid >= gross - eps) {
      stato = "SALDATO";
    } else if (totalPaid > eps) {
      stato = "PARZIALE";
    }

    // Collegamento cliente TRAMITE IMPIANTO, come in processaBatchFatture
    let clienteIdPerImpianto: string | null = null;
    if (oggetto || note) {
      const text = `${oggetto || ""} ${note || ""}`.toLowerCase();
      const impianti = await prisma.impianto.findMany({
        select: { id: true, numeroImpianto: true, clienteId: true },
        where: { numeroImpianto: { not: null } },
      });
      for (const imp of impianti) {
        if (!imp.numeroImpianto || !imp.clienteId) continue;
        const code = String(imp.numeroImpianto).toLowerCase();
        if (code && text.includes(code)) {
          clienteIdPerImpianto = imp.clienteId;
          break;
        }
      }
    }

    const updatedFattura = await prisma.fattura.upsert({
      where: { ficId: ficId },
      update: {
        tipoDocumento,
        numero,
        data: dataDoc,
        dataScadenza,
        clienteNome,
        clienteFicId,
        clienteId: clienteIdPerImpianto,
        clientePartitaIva,
        clienteCodiceFiscale,
        clienteIndirizzo,
        oggetto,
        note,
        importoNetto,
        importoIva,
        importoRA,
        importoTotale,
        stato,
        metodoPagamento,
        statoFatturaElettronica,
        articoliJson,
        pagamentiJson,
        urlDocumento
      },
      create: {
        ficId,
        tipoDocumento,
        numero,
        data: dataDoc,
        dataScadenza,
        clienteNome,
        clienteFicId,
        clienteId: clienteIdPerImpianto,
        clientePartitaIva,
        clienteCodiceFiscale,
        clienteIndirizzo,
        oggetto,
        note,
        importoNetto,
        importoIva,
        importoRA,
        importoTotale,
        stato,
        metodoPagamento,
        statoFatturaElettronica,
        articoliJson,
        pagamentiJson,
        urlDocumento
      }
    });

    revalidatePath("/fatture");
    return { success: true, message: `Fattura ${numero} sincronizzata con successo!`, data: updatedFattura };
  } catch (error: any) {
    console.error("Errore sincronizzazione singola fattura:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

// Elimina una fattura SOLO se non è ancora stata inviata/completata allo SDI
export async function deleteFatturaNonInviata(id: string) {
  try {
    const fattura = await prisma.fattura.findUnique({
      where: { id },
      select: { id: true, statoFatturaElettronica: true },
    });

    if (!fattura) {
      return { success: false, error: "Fattura non trovata" };
    }

    if (
      fattura.statoFatturaElettronica === "sent" ||
      fattura.statoFatturaElettronica === "completed"
    ) {
      return {
        success: false,
        error: "Non è possibile eliminare una fattura già inviata allo SDI.",
      };
    }

    await prisma.fattura.delete({ where: { id } });
    revalidatePath("/fatture");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione fattura:", error);
    return {
      success: false,
      error: "Errore durante l'eliminazione della fattura",
    };
  }
}

export async function inviaFatturaViaEmail(fatturaId: string, force?: boolean) {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;
    const senderIdRaw = process.env.FIC_EMAIL_SENDER_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate" };
    }
    if (!senderIdRaw || Number.isNaN(Number(senderIdRaw))) {
      return { success: false, error: "FIC_EMAIL_SENDER_ID non configurato (numero)" };
    }

    const fattura = await prisma.fattura.findUnique({
      where: { id: fatturaId },
      include: {
        cliente: true,
      },
    });

    if (!fattura) return { success: false, error: "Fattura non trovata" };
    if (!fattura.ficId) return { success: false, error: "ficId mancante sulla fattura" };
    if (!force && fattura.statoEmail === "sent") return { success: true };

    const cliente = fattura.cliente;
    if (!cliente) return { success: false, error: "Cliente non collegato alla fattura" };

    // Determina destinatario: email amministratore se il cliente ha un impianto con amministratore collegato,
    // altrimenti email cliente.
    let recipient_email: string | null = null;
    const text = `${fattura.oggetto || ""} ${fattura.note || ""}`.toLowerCase();
    const impianti = await prisma.impianto.findMany({
      where: { clienteId: cliente.id },
      select: {
        numeroImpianto: true,
        amministratore: { select: { email: true } },
      },
    });

    // prova a matchare per numeroImpianto nell'oggetto
    for (const imp of impianti) {
      const num = (imp.numeroImpianto || "").toLowerCase();
      const emailAmm = imp.amministratore?.email || null;
      if (emailAmm && num && text.includes(num)) {
        recipient_email = emailAmm;
        break;
      }
    }
    // fallback: primo amministratore con email
    if (!recipient_email) {
      const first = impianti.find((i) => i.amministratore?.email);
      if (first?.amministratore?.email) recipient_email = first.amministratore.email;
    }
    // fallback: email cliente
    if (!recipient_email) recipient_email = cliente.email || null;

    if (!recipient_email) {
      return { success: false, error: "Nessuna email destinatario disponibile (amministratore/cliente)" };
    }

    const sender_id = Number(senderIdRaw);
    const oggetto = fattura.oggetto || "";
    const subject = `Nostra fattura nr. ${fattura.numero}${oggetto ? ` - ${oggetto}` : ""}`;

    const formatEuroEmail = (value: number) => {
      const n = Number(value || 0);
      const abs = Math.abs(n);
      const fixed = abs.toFixed(2);
      const [intPart, decPart] = fixed.split(".");
      const intWithThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const sign = n < 0 ? "-" : "";
      return `€ ${sign}${intWithThousands},${decPart}`;
    };

    const dataIt = fattura.data.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Template identico all'esempio dell'utente, cambiando solo i riferimenti variabili
    const body =
      `Gentile ${cliente.denominazione},<br>\n` +
      `si trasmette in allegato nostra fattura n. ${fattura.numero} emessa in data ${dataIt}.</div><br>` +
      `<ul>` +
      `<li>Oggetto fattura: ${oggetto || "-"}</li>` +
      `<li>Importo IVA inclusa: ${formatEuroEmail(fattura.importoTotale)}</li>` +
      `</ul>\n` +
      `<br><br>Cordiali saluti,<br><strong>Nolasco S.r.l.\n` +
      ` <br><br>\n` +
      ` <i>Questa e-mail e i relativi allegati possono contenere informazioni riservate esclusivamente al DESTINATARIO specificato in indirizzo.<br>\n` +
      `                Le informazioni trasmesse attraverso la presente e-mail ed i suoi allegati sono diretti esclusivamente al destinatario e devono ritenersi riservati con divieto di diffusione e di uso salva espressa autorizzazione.<br><br>\n` +
      `                Se la presente e-mail ed i suoi allegati fossero stati ricevuti per errore da persona diversa dal destinatario siete pregati di distruggere tutto quanto ricevuto e di informare il mittente con lo stesso mezzo.<br>\n` +
      `                Qualunque utilizzazione, divulgazione o copia non autorizzata di questa comunicazione è rigorosamente vietata e comporta violazione delle disposizioni di Legge sulla tutela dei dati personali <b>REGOLAMENTO EUROPEO 2016/679</b>.<br><br>\n` +
      `                Grazie per la collaborazione.\n` +
      `            </i>`;

    const payload = {
      data: {
        sender_id,
        recipient_email,
        subject,
        body,
        include: {
          document: true,
          delivery_note: false,
          attachment: false,
          accompanying_invoice: false,
        },
        // FiC valida questi campi a livello root di "data"
        attach_pdf: true,
        send_copy: false,
      },
    };

    const cleanToken = accessToken.replace(/^Bearer\s+/i, "");
    const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents/${fattura.ficId}/email`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Errore invio email FiC:", response.status, errorText);
      return { success: false, error: `Errore FiC (${response.status}): ${errorText || response.statusText}` };
    }

    await prisma.fattura.update({
      where: { id: fatturaId },
      data: { statoEmail: "sent" },
    });

    revalidatePath("/fatture");
    return { success: true };
  } catch (error: any) {
    console.error("Errore inviaFatturaViaEmail:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function getEmailRecipientPreview(fatturaId: string) {
  try {
    const fattura = await prisma.fattura.findUnique({
      where: { id: fatturaId },
      include: {
        cliente: true,
      },
    });

    if (!fattura) return { success: false, error: "Fattura non trovata" };

    const cliente = fattura.cliente;
    if (!cliente) return { success: false, error: "Cliente non collegato alla fattura" };

    let recipient_email: string | null = null;
    const text = `${fattura.oggetto || ""} ${fattura.note || ""}`.toLowerCase();
    const impianti = await prisma.impianto.findMany({
      where: { clienteId: cliente.id },
      select: {
        numeroImpianto: true,
        amministratore: { select: { email: true } },
      },
    });

    for (const imp of impianti) {
      const num = (imp.numeroImpianto || "").toLowerCase();
      const emailAmm = imp.amministratore?.email || null;
      if (emailAmm && num && text.includes(num)) {
        recipient_email = emailAmm;
        break;
      }
    }
    if (!recipient_email) {
      const first = impianti.find((i) => i.amministratore?.email);
      if (first?.amministratore?.email) recipient_email = first.amministratore.email;
    }
    if (!recipient_email) recipient_email = cliente.email || null;

    if (!recipient_email) {
      return {
        success: false,
        error: "Nessuna email destinatario disponibile (amministratore/cliente)",
      };
    }

    const subject = `Nostra fattura nr. ${fattura.numero}${fattura.oggetto ? ` - ${fattura.oggetto}` : ""}`;

    return {
      success: true,
      recipient_email,
      subject,
    };
  } catch (error: any) {
    console.error("Errore getEmailRecipientPreview:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

// Invia una fattura già emessa al Sistema di Interscambio (SDI) tramite Fatture in Cloud
export async function inviaFatturaASdi(ficId: string) {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate" };
    }

    const cleanToken = accessToken.replace(/^Bearer\s+/i, "");
    const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents/${ficId}/e_invoice/send`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Errore invio SDI Fatture in Cloud:", response.status, errorText);
      return {
        success: false,
        error: `Errore invio allo SDI (${response.status}): ${errorText || response.statusText}`,
      };
    }

    // Segniamo SUBITO nel database locale che la fattura è stata inviata allo SDI,
    // così il pulsante non compare più anche se Fatture in Cloud impiega tempo
    // per aggiornare e_invoice_status.
    await prisma.fattura.update({
      where: { ficId: String(ficId) },
      data: {
        statoFatturaElettronica: "sent",
      },
    });

    // In secondo piano proviamo comunque ad aggiornare i dati completi dalla singola fattura
    // (stato SDI definitivo, eventuali notifiche, ecc.)
    await sincronizzaSingolaFattura(ficId);

    revalidatePath("/fatture");
    return { success: true };
  } catch (error: any) {
    console.error("Errore inviaFatturaASdi:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

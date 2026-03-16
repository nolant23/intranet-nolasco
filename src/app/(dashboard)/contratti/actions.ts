"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export async function getContratti() {
  return await prisma.contratto.findMany({
    include: {
      impianto: {
        include: {
          cliente: true,
          amministratore: true,
        },
      },
      servizi: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Solo id e impiantoId per calcolare impianti disponibili nel form (dettaglio). */
export async function getContrattiIdAndImpiantoId() {
  return await prisma.contratto.findMany({
    select: { id: true, impiantoId: true },
  });
}

export async function getContrattoById(id: string) {
  try {
    const contratto = await prisma.contratto.findUnique({
      where: { id },
      include: {
        impianto: {
          include: {
            cliente: true,
            amministratore: true,
          },
        },
        servizi: true,
      },
    });
    if (!contratto) return { success: false, error: "Contratto non trovato" };
    return { success: true, data: contratto };
  } catch (error) {
    console.error("Errore recupero contratto:", error);
    return { success: false, error: "Errore durante il recupero" };
  }
}

export async function saveContratto(data: any, servizi: any[]) {
  try {
    const { id, ...contrattoData } = data;

    if (id) {
      await prisma.contratto.update({
        where: { id },
        data: {
          ...contrattoData,
          servizi: {
            deleteMany: {},
            create: servizi,
          },
        },
      });
    } else {
      // Genera numero contratto nel formato YY-000000 in base alla dataEmissione
      const emissionDate: Date =
        contrattoData.dataEmissione instanceof Date
          ? contrattoData.dataEmissione
          : new Date(contrattoData.dataEmissione);

      const year2 = (emissionDate.getFullYear() % 100).toString().padStart(2, "0");
      const prefix = `${year2}-`;

      const last = await prisma.contratto.findFirst({
        where: {
          numero: {
            startsWith: prefix,
          },
        },
        orderBy: {
          numero: "desc",
        },
        select: { numero: true },
      });

      let nextSeq = 1;
      if (last?.numero && last.numero.length > 3) {
        const parsed = parseInt(last.numero.slice(3), 10);
        if (!Number.isNaN(parsed)) {
          nextSeq = parsed + 1;
        }
      }
      const numero = `${year2}-${nextSeq.toString().padStart(6, "0")}`;

      await prisma.contratto.create({
        data: {
          ...contrattoData,
          numero,
          servizi: {
            create: servizi,
          },
        },
      });
    }
    revalidatePath("/contratti");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio contratto:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteContratto(id: string) {
  try {
    await prisma.contratto.delete({ where: { id } });
    revalidatePath("/contratti");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione contratto:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function shouldInvoiceThisMonth(startDate: Date, periodMonths: number, year: number, month: number) {
  const deltaMonths =
    (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
  if (deltaMonths < 0) return false;
  return deltaMonths % periodMonths === 0;
}

function getPeriodMonths(periodicita: string | null | undefined) {
  switch ((periodicita || "").toLowerCase()) {
    case "mensile":
      return 1;
    case "trimestrale":
      return 3;
    case "semestrale":
      return 6;
    case "annuale":
      return 12;
    default:
      return 1;
  }
}

/** Oggetto fattura: MANUTENZIONE 1° TRIMESTRE 2026 - A25M1619, ecc. */
function buildSubjectForFattura(
  periodStart: Date,
  periodMonths: number,
  numeroImpianto: string
): string {
  const year = periodStart.getFullYear();
  const imp = numeroImpianto || "";
  if (periodMonths === 3) {
    const quarter = Math.floor(periodStart.getMonth() / 3) + 1;
    return `MANUTENZIONE ${quarter}° TRIMESTRE ${year} - ${imp}`.trim();
  }
  if (periodMonths === 6) {
    const semester = periodStart.getMonth() < 6 ? 1 : 2;
    return `MANUTENZIONE ${semester}° SEMESTRE ${year} - ${imp}`.trim();
  }
  if (periodMonths === 12) {
    return `MANUTENZIONE ANNO ${year} - ${imp}`.trim();
  }
  // Mensile: es. MANUTENZIONE GENNAIO 2026 - A25M1619
  const monthName = format(periodStart, "MMMM", { locale: it });
  const monthUpper =
    monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
  return `MANUTENZIONE ${monthUpper} ${year} - ${imp}`.trim();
}

function mapIvaToVatId(iva: string | null | undefined): string | null {
  const v10 = process.env.FIC_VAT_10_ID || null;
  const v22 = process.env.FIC_VAT_22_ID || null;
  const vRc = process.env.FIC_VAT_REVERSE_CHARGE_ID || null;
  const value = (iva || "").toLowerCase();
  if (value.startsWith("10%")) return v10;
  if (value.startsWith("22%")) return v22;
  if (value.includes("reverse")) return vRc;
  return v22; // default 22%
}

function computeGrossPrice(net: number, iva: string | null | undefined): number {
  const value = (iva || "").toLowerCase();
  let perc = 22;
  if (value.startsWith("10%")) perc = 10;
  else if (value.startsWith("22%")) perc = 22;
  else if (value.includes("reverse")) perc = 0;

  if (perc === 0) return net;
  // Manteniamo tutte le cifre decimali come fa il tuo payload manuale,
  // senza arrotondare a 2 decimali.
  const gross = net * (1 + perc / 100);
  return gross;
}

export async function generaFattureContrattiPerMese(
  year?: number,
  month?: number
) {
  const accessToken = process.env.FIC_ACCESS_TOKEN;
  const companyId = process.env.FIC_COMPANY_ID;
  if (!accessToken || !companyId) {
    return {
      success: false,
      error: "Credenziali Fatture in Cloud non configurate",
    };
  }

  const today = new Date();
  const targetYear = year ?? today.getFullYear();
  const targetMonth = month ?? today.getMonth(); // 0-based

  const cleanToken = accessToken.replace(/^Bearer\s+/i, "");

  // Recupero contratti attivi con dataInizioFatturazione valida
  const contratti = await prisma.contratto.findMany({
    where: {
      statoContratto: { in: ["Attivo", "ATTIVO"] },
      // Escludiamo i contratti gratuiti dal processo di fatturazione
      gratuito: { not: true },
      dataInizioFatturazione: {
        not: null,
        lte: new Date(targetYear, targetMonth, 1),
      },
    },
    include: {
      servizi: true,
      impianto: {
        include: {
          cliente: true,
        },
      },
    },
  });

  const paymentMethodId = process.env.FIC_PAYMENT_METHOD_ID;
  const revenueCenter = process.env.FIC_REVENUE_CENTER || "MANUTENZIONI";
  const bankIban = process.env.FIC_BANK_IBAN || "";
  const bankBeneficiary = process.env.FIC_BANK_BENEFICIARY || "";

  const created: string[] = [];
  const skipped: string[] = [];
  const alreadyExisting: string[] = [];
  const skippedDetails: {
    id: string;
    numero: string | null;
    impianto: string | null;
    cliente: string | null;
    motivo: "NO_SERVIZI" | "DATI_INCOMPLETI" | "API_ERROR";
  }[] = [];

  for (const c of contratti) {
    // DEBUG mirato per capire perché alcuni contratti risultano senza righe fatturabili
    if (c.numero === "25-000052") {
      console.log("DEBUG CONTRATTO 25-000052 - servizi:", c.servizi);
    }

    if (!c.dataInizioFatturazione || !c.impianto || !c.impianto.cliente) {
      skipped.push(c.id);
      skippedDetails.push({
        id: c.id,
        numero: c.numero,
        impianto: c.impianto?.numeroImpianto ?? null,
        cliente: c.impianto?.cliente?.denominazione ?? null,
        motivo: "DATI_INCOMPLETI",
      });
      continue;
    }
    const periodMonths = getPeriodMonths(c.periodicitaFatturazione || "Mensile");
    const start = c.dataInizioFatturazione;

    if (!shouldInvoiceThisMonth(start, periodMonths, targetYear, targetMonth)) {
      continue;
    }

    const periodStart = new Date(targetYear, targetMonth, 1);
    const periodEnd = addMonths(periodStart, periodMonths);
    periodEnd.setDate(periodEnd.getDate() - 1);

    const periodStartStr = format(periodStart, "dd/MM/yyyy");
    const periodEndStr = format(periodEnd, "dd/MM/yyyy");

    const cliente = c.impianto.cliente;

    // Prima controlliamo in modo esplicito se esiste almeno un servizio con importo > 0
    const hasBillableService = c.servizi.some((s) => {
      const rawImporto: any = (s as any).importo;
      const importoNum =
        typeof rawImporto === "number" ? rawImporto : Number(rawImporto ?? 0);
      return Number.isFinite(importoNum) && importoNum > 0;
    });

    if (!hasBillableService) {
      skipped.push(c.id);
      skippedDetails.push({
        id: c.id,
        numero: c.numero,
        impianto: c.impianto.numeroImpianto ?? null,
        cliente: c.impianto.cliente?.denominazione ?? null,
        motivo: "NO_SERVIZI",
      });
      continue;
    }

    // Costruzione righe fattura dai soli servizi con importo > 0
    const items_list: any[] = [];
    let hasRaService = false;

    for (const s of c.servizi) {
      const rawImporto: any = (s as any).importo;
      const importoNum =
        typeof rawImporto === "number"
          ? rawImporto
          : Number(rawImporto ?? 0);

      if (!Number.isFinite(importoNum) || importoNum <= 0) continue;

      const qty = periodMonths;
      const vatId = mapIvaToVatId(s.iva);

      const net_price = importoNum;
      const gross_price = computeGrossPrice(net_price, s.iva);

      if (s.ra) hasRaService = true;

      items_list.push({
        name: s.nome,
        measure: "mesi",
        net_price,
        gross_price,
        qty,
        vat: vatId ? { id: Number(vatId) } : undefined,
        stock: null,
        description: `PERIODO ${periodStartStr} - ${periodEndStr} - IMPIANTO ${c.impianto.numeroImpianto || "-"}\nCONTRATTO N. ${c.numero || c.id}\nINDIRIZZO IMPIANTO: ${[c.impianto.indirizzo, c.impianto.comune, c.impianto.provincia].filter(Boolean).join(" - ") || "Non disponibile"}`,
        not_taxable: false,
      });
    }

    if (items_list.length === 0) {
      skipped.push(c.id);
      skippedDetails.push({
        id: c.id,
        numero: c.numero,
        impianto: c.impianto.numeroImpianto ?? null,
        cliente: c.impianto.cliente?.denominazione ?? null,
        motivo: "NO_SERVIZI",
      });
      continue;
    }

    // Base RA: solo servizi con ra = true (importo mensile * mesi periodo)
    const amount_withholding_tax_taxable = c.servizi.reduce((acc, s: any) => {
      if (!s.ra) return acc;
      const rawImporto: any = s.importo;
      const importoNum =
        typeof rawImporto === "number"
          ? rawImporto
          : Number(rawImporto ?? 0);
      if (!Number.isFinite(importoNum) || importoNum <= 0) return acc;
      const qty = periodMonths;
      return acc + importoNum * qty;
    }, 0);

    const amount_withholding_tax =
      amount_withholding_tax_taxable > 0
        ? Number((amount_withholding_tax_taxable * 0.04).toFixed(2))
        : 0;

    const use_split_payment = cliente.tipologia === "PA";

    const subject = buildSubjectForFattura(
      periodStart,
      periodMonths,
      c.impianto.numeroImpianto || ""
    );

    const payload = {
      data: {
        type: "invoice",
        e_invoice: true,
        // Data fattura = giorno di esecuzione della richiesta API
        date: format(new Date(), "yyyy-MM-dd"),
        amount_withholding_tax:
          amount_withholding_tax > 0 ? amount_withholding_tax : null,
        ei_cassa2_type: null,
        ei_withholding_tax_causal: "W",
        ei_other_withholding_tax_type: null,
        ei_other_withholding_tax_causal: null,
        use_gross_prices: true,
        delivery_note: false,
        accompanying_invoice: false,
        amount_due_discount: 0,
        show_payment_method: true,
        show_payments: true,
        show_totals: "all",
        show_notification_button: false,
        is_marked: false,
        price_list_id: null,
        entity: {
          id:
            cliente.ficId && !Number.isNaN(Number(cliente.ficId))
              ? Number(cliente.ficId)
              : undefined,
          tax_code: cliente.ficTaxCode || null,
          name: cliente.denominazione,
          address_street: cliente.indirizzo,
          address_city: cliente.comune,
          address_postal_code: cliente.cap,
          address_province: cliente.provincia,
          country: "Italia",
        },
        currency: {
          id: "EUR",
          exchange_rate: "1.00000",
          symbol: "€",
        },
        payment_method: paymentMethodId
          ? {
              id: Number(paymentMethodId),
            }
          : undefined,
        use_split_payment,
        merged_in: null,
        ei_data: {
          bank_iban: bankIban || null,
          payment_method: "MP05",
          bank_beneficiary: bankBeneficiary || null,
        },
        original_document: null,
        items_list,
        revenue_center: revenueCenter,
        withholding_tax: hasRaService ? 4 : undefined,
        amount_withholding_tax_taxable:
          amount_withholding_tax_taxable > 0
            ? amount_withholding_tax_taxable
            : null,
        withholding_tax_taxable: null,
        show_tspay_button: false,
        subject,
      },
      options: {
        fix_payments: true,
      },
    };

    const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "Errore creazione fattura per contratto",
        c.id,
        res.status,
        text
      );

      // Caso particolare: 409 "Esiste già una fattura con data successiva..."
      // Lo trattiamo come "già esistente" invece di vero errore.
      if (
        res.status === 409 &&
        text.includes("Esiste gi\\u00e0 una fattura con data successiva")
      ) {
        alreadyExisting.push(c.id);
      } else {
        skipped.push(c.id);
        skippedDetails.push({
          id: c.id,
          numero: c.numero,
          impianto: c.impianto.numeroImpianto ?? null,
          cliente: c.impianto.cliente?.denominazione ?? null,
          motivo: "API_ERROR",
        });
      }
      continue;
    }

    const json = await res.json().catch(() => null);
    if (json?.data?.id) {
      // Segniamo il contratto come fatturato correttamente
      created.push(c.id);

      // Creiamo/aggiorniamo SUBITO la fattura anche nel DB locale,
      // così compare in /fatture senza dover lanciare una sync separata.
      const doc = json.data;
      const ficId = String(doc.id);
      const tipoDocumento = doc.type || null;
      const numero = doc.number ? String(doc.number) : "";
      const dataDoc = doc.date ? new Date(doc.date) : new Date();
      const dataScadenza = doc.next_due_date ? new Date(doc.next_due_date) : null;

      const clienteNome = cliente.denominazione;
      const clienteFicId = cliente.ficId ?? null;
      const clientePartitaIva = cliente.ficVatNumber ?? null;
      const clienteCodiceFiscale = cliente.ficTaxCode ?? null;
      const clienteIndirizzo = [cliente.indirizzo, cliente.cap, cliente.comune, cliente.provincia]
        .filter(Boolean)
        .join(", ") || null;

      const oggettoDoc = doc.subject || subject || null;
      const noteDoc = doc.notes || null;

      const importoNetto = doc.amount_net || 0;
      let importoIva = doc.amount_vat || doc.amount_tax || 0;
      if (importoIva === 0 && doc.amount_gross && doc.amount_net) {
        importoIva = doc.amount_gross - doc.amount_net;
      }
      const importoRA = doc.amount_withholding_tax || 0;
      const importoTotale = doc.amount_gross || 0;

      const metodoPagamento = doc.payment_method?.name || null;
      const statoFatturaElettronica = doc.e_invoice_status || null;

      const articoliJson = doc.items_list ? JSON.stringify(doc.items_list) : null;
      const pagamentiJson = doc.payments_list ? JSON.stringify(doc.payments_list) : null;

      // Stato iniziale: non saldato (l'utente potrà gestire i pagamenti da FiC / sync)
      const stato = "NON SALDATO";

      await prisma.fattura.upsert({
        where: { ficId },
        update: {
          tipoDocumento,
          numero,
          data: dataDoc,
          dataScadenza,
          clienteNome,
          clienteFicId,
          clienteId: c.impianto.clienteId ?? null,
          clientePartitaIva,
          clienteCodiceFiscale,
          clienteIndirizzo,
          oggetto: oggettoDoc,
          note: noteDoc,
          importoNetto,
          importoIva,
          importoRA,
          importoTotale,
          stato,
          metodoPagamento,
          statoFatturaElettronica,
          articoliJson,
          pagamentiJson,
          // Il PDF verrà gestito dalla normale sync / aggiornamento singola fattura
          urlDocumento: undefined,
        },
        create: {
          ficId,
          tipoDocumento,
          numero,
          data: dataDoc,
          dataScadenza,
          clienteNome,
          clienteFicId,
          clienteId: c.impianto.clienteId ?? null,
          clientePartitaIva,
          clienteCodiceFiscale,
          clienteIndirizzo,
          oggetto: oggettoDoc,
          note: noteDoc,
          importoNetto,
          importoIva,
          importoRA,
          importoTotale,
          stato,
          metodoPagamento,
          statoFatturaElettronica,
          articoliJson,
          pagamentiJson,
          urlDocumento: null,
        },
      });
    } else {
      skipped.push(c.id);
      skippedDetails.push({
        id: c.id,
        numero: c.numero,
        impianto: c.impianto.numeroImpianto ?? null,
        cliente: c.impianto.cliente?.denominazione ?? null,
        motivo: "API_ERROR",
      });
    }

    // piccola pausa per non saturare l'API
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    success: true,
    created,
    skipped,
    alreadyExisting,
    skippedDetails,
  };
}

export async function creaFatturaPerContratto(
  contrattoId: string,
  mesi: number,
  periodoTesto: string,
  oggetto?: string
) {
  const accessToken = process.env.FIC_ACCESS_TOKEN;
  const companyId = process.env.FIC_COMPANY_ID;
  if (!accessToken || !companyId) {
    return {
      success: false,
      error: "Credenziali Fatture in Cloud non configurate",
    };
  }

  const cleanToken = accessToken.replace(/^Bearer\s+/i, "");

  const c = await prisma.contratto.findUnique({
    where: { id: contrattoId },
    include: {
      servizi: true,
      impianto: {
        include: {
          cliente: true,
        },
      },
    },
  });

  if (!c || !c.impianto || !c.impianto.cliente) {
    return { success: false, error: "Contratto/impianto/cliente non valido" };
  }

  const cliente = c.impianto.cliente;

  const paymentMethodId = process.env.FIC_PAYMENT_METHOD_ID;
  const revenueCenter = process.env.FIC_REVENUE_CENTER || "MANUTENZIONI";
  const bankIban = process.env.FIC_BANK_IBAN || "";
  const bankBeneficiary = process.env.FIC_BANK_BENEFICIARY || "";

  const items_list: any[] = [];

  for (const s of c.servizi) {
    const rawImporto: any = (s as any).importo;
    const importoNum =
      typeof rawImporto === "number" ? rawImporto : Number(rawImporto ?? 0);
    if (!Number.isFinite(importoNum) || importoNum <= 0) continue;

    const qty = mesi > 0 ? mesi : 1;
    const vatId = mapIvaToVatId(s.iva);
    const net_price = importoNum;
    const gross_price = computeGrossPrice(net_price, s.iva);

    items_list.push({
      name: s.nome,
      measure: "mesi",
      net_price,
      gross_price,
      qty,
      vat: vatId ? { id: Number(vatId) } : undefined,
      stock: null,
      description: `PERIODO ${periodoTesto} - IMPIANTO ${c.impianto.numeroImpianto || "-"}\nCONTRATTO N. ${c.numero || c.id}\nINDIRIZZO IMPIANTO: ${[c.impianto.indirizzo, c.impianto.comune, c.impianto.provincia].filter(Boolean).join(" - ") || "Non disponibile"}`,
      not_taxable: false,
    });
  }

  if (items_list.length === 0) {
    return {
      success: false,
      error: "Nessun servizio con importo > 0 per questo contratto",
    };
  }

  const amount_withholding_tax_taxable = c.servizi.reduce((acc, s: any) => {
    if (!s.ra) return acc;
    const rawImporto: any = s.importo;
    const importoNum =
      typeof rawImporto === "number" ? rawImporto : Number(rawImporto ?? 0);
    if (!Number.isFinite(importoNum) || importoNum <= 0) return acc;
    const qty = mesi > 0 ? mesi : 1;
    return acc + importoNum * qty;
  }, 0);
  const amount_withholding_tax =
    amount_withholding_tax_taxable > 0
      ? Number((amount_withholding_tax_taxable * 0.04).toFixed(2))
      : 0;

  const use_split_payment = cliente.tipologia === "PA";

  const today = new Date();

  const subject =
    oggetto?.trim() ||
    `MANUTENZIONE ${periodoTesto} - ${c.impianto.numeroImpianto || ""}`;

  const payload = {
    data: {
      type: "invoice",
      e_invoice: true,
      date: format(today, "yyyy-MM-dd"),
      // Se non c'è RA, FiC accetta amount_withholding_tax = 0 (come nel payload di esempio)
      amount_withholding_tax: amount_withholding_tax,
      ei_cassa2_type: null,
      ei_withholding_tax_causal: "W",
      ei_other_withholding_tax_type: null,
      ei_other_withholding_tax_causal: null,
      use_gross_prices: true,
      delivery_note: false,
      accompanying_invoice: false,
      amount_due_discount: 0,
      show_payment_method: true,
      show_payments: true,
      show_totals: "all",
      show_notification_button: false,
      is_marked: false,
      price_list_id: null,
      entity: {
        id:
          cliente.ficId && !Number.isNaN(Number(cliente.ficId))
            ? Number(cliente.ficId)
            : undefined,
        tax_code: cliente.ficTaxCode || null,
        name: cliente.denominazione,
        address_street: cliente.indirizzo,
        address_city: cliente.comune,
        address_postal_code: cliente.cap,
        address_province: cliente.provincia,
        country: "Italia",
      },
      currency: {
        id: "EUR",
        exchange_rate: "1.00000",
        symbol: "€",
      },
      payment_method: paymentMethodId
        ? {
            id: Number(paymentMethodId),
          }
        : undefined,
      use_split_payment,
      merged_in: null,
      ei_data: {
        bank_iban: bankIban || null,
        payment_method: "MP05",
        bank_beneficiary: bankBeneficiary || null,
      },
      original_document: null,
      items_list,
      revenue_center: revenueCenter,
      // Se non c'è RA, omettiamo completamente withholding_tax e inviamo amount_withholding_tax_taxable = 0
      withholding_tax: amount_withholding_tax > 0 ? 4 : undefined,
      amount_withholding_tax_taxable: amount_withholding_tax_taxable,
      withholding_tax_taxable: null,
      show_tspay_button: false,
      subject,
    },
    options: {
      fix_payments: true,
    },
  };

  const url = `https://api-v2.fattureincloud.it/c/${companyId}/issued_documents`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "Errore creazione fattura manuale per contratto",
      c.id,
      res.status,
      text
    );
    return {
      success: false,
      error: `Errore Fatture in Cloud (${res.status}): ${text}`,
    };
  }

  const json = await res.json().catch(() => null);
  if (!json?.data?.id) {
    return {
      success: false,
      error: "Risposta Fatture in Cloud senza ID fattura",
    };
  }

  const doc = json.data;
  const ficId = String(doc.id);
  const tipoDocumento = doc.type || null;
  const numero = doc.number ? String(doc.number) : "";
  const dataDoc = doc.date ? new Date(doc.date) : today;
  const dataScadenza = doc.next_due_date ? new Date(doc.next_due_date) : null;

  const clienteNome = cliente.denominazione;
  const clienteFicId = cliente.ficId ?? null;
  const clientePartitaIva = cliente.ficVatNumber ?? null;
  const clienteCodiceFiscale = cliente.ficTaxCode ?? null;
  const clienteIndirizzo = [cliente.indirizzo, cliente.cap, cliente.comune, cliente.provincia]
    .filter(Boolean)
    .join(", ") || null;

  const oggettoDoc = doc.subject || subject || null;
  const noteDoc = doc.notes || null;

  const importoNetto = doc.amount_net || 0;
  let importoIva = doc.amount_vat || doc.amount_tax || 0;
  if (importoIva === 0 && doc.amount_gross && doc.amount_net) {
    importoIva = doc.amount_gross - doc.amount_net;
  }
  const importoRA = doc.amount_withholding_tax || 0;
  const importoTotale = doc.amount_gross || 0;

  const metodoPagamento = doc.payment_method?.name || null;
  const statoFatturaElettronica = doc.e_invoice_status || null;

  const articoliJson = doc.items_list ? JSON.stringify(doc.items_list) : null;
  const pagamentiJson = doc.payments_list ? JSON.stringify(doc.payments_list) : null;

  // Stato iniziale: non saldato
  const stato = "NON SALDATO";

  const fattura = await prisma.fattura.upsert({
    where: { ficId },
    update: {
      tipoDocumento,
      numero,
      data: dataDoc,
      dataScadenza,
      clienteNome,
      clienteFicId,
      clienteId: c.impianto.clienteId ?? null,
      clientePartitaIva,
      clienteCodiceFiscale,
      clienteIndirizzo,
      oggetto: oggettoDoc,
      note: noteDoc,
      importoNetto,
      importoIva,
      importoRA,
      importoTotale,
      stato,
      metodoPagamento,
      statoFatturaElettronica,
      articoliJson,
      pagamentiJson,
      urlDocumento: undefined,
    },
    create: {
      ficId,
      tipoDocumento,
      numero,
      data: dataDoc,
      dataScadenza,
      clienteNome,
      clienteFicId,
      clienteId: c.impianto.clienteId ?? null,
      clientePartitaIva,
      clienteCodiceFiscale,
      clienteIndirizzo,
      oggetto: oggettoDoc,
      note: noteDoc,
      importoNetto,
      importoIva,
      importoRA,
      importoTotale,
      stato,
      metodoPagamento,
      statoFatturaElettronica,
      articoliJson,
      pagamentiJson,
      urlDocumento: null,
    },
  });

  return {
    success: true,
    ficId: doc.id,
    numero: doc.number,
    fatturaId: fattura.id,
  };
}


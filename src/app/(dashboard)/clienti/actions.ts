"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_PAGE_SIZE = 25;

export async function getClienti() {
  return await prisma.cliente.findMany({
    orderBy: { denominazione: "asc" },
  });
}

export async function getClientiPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  search?: string | null
) {
  const where = search?.trim()
    ? {
        OR: [
          { denominazione: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
          { indirizzo: { contains: search.trim(), mode: "insensitive" as const } },
          { comune: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { denominazione: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.cliente.count({ where }),
  ]);
  return { data, total };
}

const CLIENTE_DETAIL_TAKE = 50;

export async function getClienteDetail(clienteId: string) {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        impianti: {
          select: { id: true, numeroImpianto: true, indirizzo: true },
          orderBy: { numeroImpianto: "asc" },
          take: 200,
        },
      },
    });

    if (!cliente) return { success: false, error: "Cliente non trovato" };

    const impiantoIds = cliente.impianti.map((i: { id: string }) => i.id);

    const [fatture, contratti, interventi, manutenzioni] = await Promise.all([
      prisma.fattura.findMany({
        where: {
          OR: [
            { clienteId: cliente.id },
            ...(cliente.ficId ? [{ clienteFicId: cliente.ficId }] : []),
            ...(cliente.ficVatNumber ? [{ clientePartitaIva: cliente.ficVatNumber }] : []),
            ...(cliente.ficTaxCode ? [{ clienteCodiceFiscale: cliente.ficTaxCode }] : []),
            { clienteNome: cliente.denominazione },
          ],
        },
        orderBy: { data: "desc" },
        take: CLIENTE_DETAIL_TAKE,
      }),
      impiantoIds.length > 0
        ? prisma.contratto.findMany({
            where: { impiantoId: { in: impiantoIds } },
            include: { impianto: { select: { id: true, numeroImpianto: true, indirizzo: true } } },
            orderBy: { dataEmissione: "desc" },
            take: CLIENTE_DETAIL_TAKE,
          })
        : Promise.resolve([]),
      impiantoIds.length > 0
        ? prisma.intervento.findMany({
            where: { impiantoId: { in: impiantoIds } },
            include: { impianto: { select: { id: true, numeroImpianto: true, indirizzo: true } }, tecnico: { select: { name: true } } },
            orderBy: { dataIntervento: "desc" },
            take: CLIENTE_DETAIL_TAKE,
          })
        : Promise.resolve([]),
      impiantoIds.length > 0
        ? prisma.manutenzione.findMany({
            where: { impiantoId: { in: impiantoIds } },
            include: { impianto: { select: { id: true, numeroImpianto: true, indirizzo: true } }, tecnico: { select: { name: true } } },
            orderBy: { dataManutenzione: "desc" },
            take: CLIENTE_DETAIL_TAKE,
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        ...cliente,
        fatture,
        impianti: cliente.impianti,
        contratti,
        interventi,
        manutenzioni,
      },
    };
  } catch (error: any) {
    console.error("Errore dettaglio cliente:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function fetchClientiInCloudList() {
  try {
    const accessToken = process.env.FIC_ACCESS_TOKEN;
    const companyId = process.env.FIC_COMPANY_ID;

    if (!accessToken || !companyId) {
      return { success: false, error: "Credenziali Fatture in Cloud non configurate (verifica file .env)" };
    }

    const cleanToken = accessToken.replace(/^Bearer\s+/i, "");

    let allClients: any[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const url = `https://api-v2.fattureincloud.it/c/${companyId}/entities/clients?fieldset=detailed&per_page=50&page=${currentPage}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Errore API FiC (clienti):", errorText);
        return { success: false, error: `Errore chiamata API: ${response.statusText}` };
      }

      const json = await response.json();

      if (json.data && Array.isArray(json.data)) {
        allClients = allClients.concat(json.data);
      }

      lastPage = json.last_page || json.pagination?.total_pages || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return { success: true, clients: allClients };
  } catch (error: any) {
    console.error("Errore fetch clienti FiC:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function processaBatchClientiFiC(clients: any[]) {
  try {
    for (const c of clients) {
      const ficId = c.id != null ? String(c.id) : null;
      if (!ficId) continue;

      const ficTypeRaw = (c.type != null ? String(c.type) : "").toLowerCase().trim();
      const tipologiaFromFiC =
        ficTypeRaw === "person"
          ? "Persona Fisica"
          : ficTypeRaw === "company"
            ? "Azienda"
            : ficTypeRaw === "condo"
              ? "Condominio"
              : ficTypeRaw === "pa"
                ? "PA"
                : "Azienda";

      const denominazione = c.name || "";
      const indirizzoParts = [c.address_street, c.address_extra].filter(Boolean);
      const indirizzo = indirizzoParts.length ? indirizzoParts.join(" ") : "-";

      const comune = c.address_city || "-";
      const cap = c.address_postal_code || "-";
      const provincia = c.address_province || "-";

      // Aggiorniamo anche i campi "gestionali" principali dove possibile
      const email = c.email || null;
      const pec = c.certified_email || null;
      const cellulare = c.phone || null;

      await prisma.cliente.upsert({
        where: { ficId },
        update: {
          denominazione,
          indirizzo,
          comune,
          cap,
          provincia,
          email,
          pec,
          cellulare,
          tipologia: tipologiaFromFiC,

          ficCode: c.code || null,
          ficType: c.type || null,
          ficFirstName: c.first_name || null,
          ficLastName: c.last_name || null,
          ficContactPerson: c.contact_person || null,
          ficVatNumber: c.vat_number || null,
          ficTaxCode: c.tax_code || null,
          ficAddressStreet: c.address_street || null,
          ficAddressPostalCode: c.address_postal_code || null,
          ficAddressCity: c.address_city || null,
          ficAddressProvince: c.address_province || null,
          ficAddressExtra: c.address_extra || null,
          ficCountry: c.country || null,
          ficCountryIso: c.country_iso || null,
          ficCertifiedEmail: c.certified_email || null,
          ficPhone: c.phone || null,
          ficFax: c.fax || null,
          ficNotes: c.notes || null,
          ficDefaultVatJson: c.default_vat ? JSON.stringify(c.default_vat) : null,
          ficDefaultPaymentTerms: c.default_payment_terms ?? null,
          ficDefaultPaymentTermsType: c.default_payment_terms_type || null,
          ficDefaultPaymentMethodJson: c.default_payment_method ? JSON.stringify(c.default_payment_method) : null,
          ficBankIban: c.bank_iban || null,
          ficBankName: c.bank_name || null,
          ficBankSwift: c.bank_swift || null,
          ficShippingAddressJson: c.shipping_address ? JSON.stringify(c.shipping_address) : null,
          ficEInvoice: c.e_invoice ?? null,
          ficEiCode: c.ei_code || null,
          ficDiscountCustom: c.discount_custom ?? null,
          ficCreatedAt: c.created_at ? new Date(c.created_at) : null,
          ficUpdatedAt: c.updated_at ? new Date(c.updated_at) : null,
        },
        create: {
          ficId,
          denominazione,
          indirizzo,
          comune,
          cap,
          provincia,
          email,
          pec,
          cellulare,
          tipologia: tipologiaFromFiC,

          ficCode: c.code || null,
          ficType: c.type || null,
          ficFirstName: c.first_name || null,
          ficLastName: c.last_name || null,
          ficContactPerson: c.contact_person || null,
          ficVatNumber: c.vat_number || null,
          ficTaxCode: c.tax_code || null,
          ficAddressStreet: c.address_street || null,
          ficAddressPostalCode: c.address_postal_code || null,
          ficAddressCity: c.address_city || null,
          ficAddressProvince: c.address_province || null,
          ficAddressExtra: c.address_extra || null,
          ficCountry: c.country || null,
          ficCountryIso: c.country_iso || null,
          ficCertifiedEmail: c.certified_email || null,
          ficPhone: c.phone || null,
          ficFax: c.fax || null,
          ficNotes: c.notes || null,
          ficDefaultVatJson: c.default_vat ? JSON.stringify(c.default_vat) : null,
          ficDefaultPaymentTerms: c.default_payment_terms ?? null,
          ficDefaultPaymentTermsType: c.default_payment_terms_type || null,
          ficDefaultPaymentMethodJson: c.default_payment_method ? JSON.stringify(c.default_payment_method) : null,
          ficBankIban: c.bank_iban || null,
          ficBankName: c.bank_name || null,
          ficBankSwift: c.bank_swift || null,
          ficShippingAddressJson: c.shipping_address ? JSON.stringify(c.shipping_address) : null,
          ficEInvoice: c.e_invoice ?? null,
          ficEiCode: c.ei_code || null,
          ficDiscountCustom: c.discount_custom ?? null,
          ficCreatedAt: c.created_at ? new Date(c.created_at) : null,
          ficUpdatedAt: c.updated_at ? new Date(c.updated_at) : null,
        },
      });

      // Collega automaticamente le fatture e note di credito già sincronizzate con questo ficId cliente
      // (le fatture/note arrivano con entity.id => clienteFicId)
      const cliente = await prisma.cliente.findUnique({ where: { ficId }, select: { id: true } });
      if (cliente?.id) {
        const vat = c.vat_number ? String(c.vat_number) : null;
        const tax = c.tax_code ? String(c.tax_code) : null;

        // 1) Match diretto su clienteFicId (se presente nelle fatture)
        await prisma.fattura.updateMany({
          where: { clienteFicId: ficId, clienteId: null },
          data: { clienteId: cliente.id },
        });
        await prisma.notaCredito.updateMany({
          where: { clienteFicId: ficId, clienteId: null },
          data: { clienteId: cliente.id },
        });

        // 2) Fallback: collega usando P.IVA / Cod.Fiscale / Nome (e setta anche clienteFicId se mancante)
        if (vat || tax) {
          await prisma.fattura.updateMany({
            where: {
              clienteId: null,
              OR: [
                ...(vat ? [{ clientePartitaIva: vat }] : []),
                ...(tax ? [{ clienteCodiceFiscale: tax }] : []),
              ],
            },
            data: { clienteId: cliente.id, clienteFicId: ficId },
          });
          await prisma.notaCredito.updateMany({
            where: {
              clienteId: null,
              OR: [
                ...(vat ? [{ clientePartitaIva: vat }] : []),
                ...(tax ? [{ clienteCodiceFiscale: tax }] : []),
              ],
            },
            data: { clienteId: cliente.id, clienteFicId: ficId },
          });
        }

        await prisma.fattura.updateMany({
          where: { clienteId: null, clienteNome: denominazione },
          data: { clienteId: cliente.id, clienteFicId: ficId },
        });
        await prisma.notaCredito.updateMany({
          where: { clienteId: null, clienteNome: denominazione },
          data: { clienteId: cliente.id, clienteFicId: ficId },
        });
      }
    }

    revalidatePath("/clienti");
    return { success: true };
  } catch (error: any) {
    console.error("Errore processamento batch clienti FiC:", error);
    return { success: false, error: `Errore imprevisto: ${error.message || String(error)}` };
  }
}

export async function saveCliente(data: any) {
  try {
    if (data.id) {
      await prisma.cliente.update({
        where: { id: data.id },
        data,
      });
    } else {
      await prisma.cliente.create({
        data,
      });
    }
    revalidatePath("/clienti");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio cliente:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteCliente(id: string) {
  try {
    await prisma.cliente.delete({ where: { id } });
    revalidatePath("/clienti");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione cliente:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}

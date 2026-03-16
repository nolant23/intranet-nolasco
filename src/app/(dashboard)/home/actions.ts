"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/money";

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchResult = {
  query: string;
  clienti: SearchItem[];
  amministratori: SearchItem[];
  impianti: SearchItem[];
  contratti: SearchItem[];
  interventi: SearchItem[];
  manutenzioni: SearchItem[];
  fatture: SearchItem[];
};

export async function globalSearch(raw: string): Promise<GlobalSearchResult> {
  const query = (raw || "").trim();
  if (query.length < 2) {
    return {
      query,
      clienti: [],
      amministratori: [],
      impianti: [],
      contratti: [],
      interventi: [],
      manutenzioni: [],
      fatture: [],
    };
  }

  const q = query;
  const contains = (field: string) => ({ contains: field, mode: "insensitive" as const });

  const [clienti, amministratori, impianti, contratti, interventi, manutenzioni] =
    await Promise.all([
      prisma.cliente.findMany({
        where: {
          OR: [
            { denominazione: contains(q) },
            { indirizzo: contains(q) },
            { comune: contains(q) },
            { cap: contains(q) },
            { provincia: contains(q) },
            { email: contains(q) },
            { pec: contains(q) },
            { codiceSdi: contains(q) },
            { cellulare: contains(q) },
            { tipologia: contains(q) },
          ],
        },
        take: 20,
        orderBy: { denominazione: "asc" },
        select: {
          id: true,
          denominazione: true,
          indirizzo: true,
          comune: true,
          cap: true,
          provincia: true,
        },
      }),
      prisma.amministratore.findMany({
        where: {
          OR: [
            { denominazione: contains(q) },
            { indirizzo: contains(q) },
            { comune: contains(q) },
            { cap: contains(q) },
            { provincia: contains(q) },
            { email: contains(q) },
            { pec: contains(q) },
            { telefono: contains(q) },
            { cellulare: contains(q) },
            { codiceSdi: contains(q) },
            { note: contains(q) },
          ],
        },
        take: 20,
        orderBy: { denominazione: "asc" },
        select: {
          id: true,
          denominazione: true,
          indirizzo: true,
          comune: true,
        },
      }),
      prisma.impianto.findMany({
        where: {
          OR: [
            { indirizzo: contains(q) },
            { comune: contains(q) },
            { cap: contains(q) },
            { provincia: contains(q) },
            { numeroImpianto: contains(q) },
            { matricola: contains(q) },
            { numeroFabbrica: contains(q) },
            { tipologia: contains(q) },
            { enteNotificato: contains(q) },
            { costruttore: contains(q) },
            { cliente: { denominazione: contains(q) } },
            { amministratore: { denominazione: contains(q) } },
          ],
        },
        take: 20,
        orderBy: { indirizzo: "asc" },
        select: {
          id: true,
          numeroImpianto: true,
          indirizzo: true,
          comune: true,
          cap: true,
          provincia: true,
          cliente: { select: { denominazione: true } },
        },
      }),
      prisma.contratto.findMany({
        where: {
          OR: [
            { numero: contains(q) },
            { tipologia: contains(q) },
            { statoContratto: contains(q) },
            { periodicitaFatturazione: contains(q) },
            { impianto: { numeroImpianto: contains(q) } },
            { impianto: { indirizzo: contains(q) } },
            { impianto: { comune: contains(q) } },
            { impianto: { cliente: { denominazione: contains(q) } } },
          ],
        },
        take: 20,
        orderBy: { dataEmissione: "desc" },
        select: {
          id: true,
          numero: true,
          statoContratto: true,
          impianto: {
            select: {
              id: true,
              numeroImpianto: true,
              indirizzo: true,
            },
          },
        },
      }),
      prisma.intervento.findMany({
        where: {
          OR: [
            { descrizione: contains(q) },
            { numeroRapportino: contains(q) },
            { clienteFirmatario: contains(q) },
            { partiSostituite: contains(q) },
            { materialeOrdinare: contains(q) },
            { impianto: { numeroImpianto: contains(q) } },
            { impianto: { indirizzo: contains(q) } },
            { impianto: { comune: contains(q) } },
            { impianto: { cliente: { denominazione: contains(q) } } },
            { tecnico: { name: contains(q) } },
          ],
        },
        take: 20,
        orderBy: { dataIntervento: "desc" },
        select: {
          id: true,
          dataIntervento: true,
          numeroRapportino: true,
          descrizione: true,
          impianto: { select: { numeroImpianto: true, indirizzo: true } },
          tecnico: { select: { name: true } },
        },
      }),
      prisma.manutenzione.findMany({
        where: {
          OR: [
            { clienteFirmatario: contains(q) },
            { note: contains(q) },
            { impianto: { numeroImpianto: contains(q) } },
            { impianto: { indirizzo: contains(q) } },
            { impianto: { comune: contains(q) } },
            { impianto: { cliente: { denominazione: contains(q) } } },
            { tecnico: { name: contains(q) } },
          ],
        },
        take: 20,
        orderBy: { dataManutenzione: "desc" },
        select: {
          id: true,
          dataManutenzione: true,
          impianto: { select: { numeroImpianto: true, indirizzo: true } },
          tecnico: { select: { name: true } },
          clienteFirmatario: true,
        },
      }),
    ]);

  // Fatture: ricerca diretta + fatture collegate agli impianti trovati per indirizzo (oggetto/note contengono numeroImpianto)
  const impiantiNumeroImpianto = [...new Set(impianti.map((i) => i.numeroImpianto).filter(Boolean))] as string[];
  const fattureOrConditions: Prisma.FatturaWhereInput[] = [
    { numero: contains(q) },
    { clienteNome: contains(q) },
    { oggetto: contains(q) },
    { note: contains(q) },
    { stato: contains(q) },
  ];
  for (const num of impiantiNumeroImpianto) {
    fattureOrConditions.push({ oggetto: { contains: num, mode: "insensitive" } });
    fattureOrConditions.push({ note: { contains: num, mode: "insensitive" } });
  }
  const fatture = await prisma.fattura.findMany({
    where: { OR: fattureOrConditions },
    take: 20,
    orderBy: { data: "desc" },
    select: {
      id: true,
      numero: true,
      data: true,
      clienteNome: true,
      importoTotale: true,
      stato: true,
      oggetto: true,
    },
  });

  return {
    query,
    clienti: clienti.map((c) => ({
      id: c.id,
      title: c.denominazione,
      subtitle: `${c.indirizzo} — ${c.cap} ${c.comune} (${c.provincia})`,
      href: `/clienti/${c.id}`,
    })),
    amministratori: amministratori.map((a) => ({
      id: a.id,
      title: a.denominazione,
      subtitle: `${a.indirizzo} — ${a.comune}`,
      href: `/amministratori/${a.id}`,
    })),
    impianti: impianti.map((i) => ({
      id: i.id,
      title: `${i.numeroImpianto || "-"} — ${i.indirizzo}`,
      subtitle: `${i.cap || "-"} ${i.comune} (${i.provincia || "-"})${i.cliente?.denominazione ? ` • ${i.cliente.denominazione}` : ""}`,
      href: `/impianti/${i.id}`,
    })),
    contratti: contratti.map((c) => ({
      id: c.id,
      title: c.numero ? `Contratto ${c.numero}` : `Contratto ${c.id.slice(0, 6)}`,
      subtitle: `${c.statoContratto || "-"}${c.impianto?.numeroImpianto ? ` • Impianto ${c.impianto.numeroImpianto}` : ""}`,
      href: `/contratti/${c.id}`,
    })),
    interventi: interventi.map((it) => ({
      id: it.id,
      title: `${new Date(it.dataIntervento).toLocaleDateString("it-IT")}${it.numeroRapportino ? ` • ${it.numeroRapportino}` : ""}`,
      subtitle: `${it.impianto?.numeroImpianto || "-"} — ${it.impianto?.indirizzo || ""}${it.tecnico?.name ? ` • ${it.tecnico.name}` : ""}`,
      href: `/interventi/${it.id}`,
    })),
    manutenzioni: manutenzioni.map((m) => ({
      id: m.id,
      title: `${new Date(m.dataManutenzione).toLocaleDateString("it-IT")}`,
      subtitle: `${m.impianto?.numeroImpianto || "-"} — ${m.impianto?.indirizzo || ""}${m.tecnico?.name ? ` • ${m.tecnico.name}` : ""}`,
      href: `/manutenzioni/${m.id}`,
    })),
    fatture: fatture.map((f) => ({
      id: f.id,
      title: `Fattura n. ${f.numero}`,
      subtitle: `${f.clienteNome || "-"} — ${new Date(f.data).toLocaleDateString("it-IT")} — ${formatEuro(f.importoTotale)}${f.stato ? ` • ${f.stato}` : ""}`,
      href: `/fatture/${f.id}`,
    })),
  };
}


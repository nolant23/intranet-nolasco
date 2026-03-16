"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { globalSearch, type GlobalSearchResult } from "./actions";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Search } from "lucide-react";
import Image from "next/image";

type TabKey =
  | "Clienti"
  | "Amministratori"
  | "Impianti"
  | "Contratti"
  | "Interventi"
  | "Manutenzioni"
  | "Fatture";

export function HomeClient() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [q, setQ] = useState("");
  const [active, setActive] = useState<TabKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<GlobalSearchResult>({
    query: "",
    clienti: [],
    amministratori: [],
    impianti: [],
    contratti: [],
    interventi: [],
    manutenzioni: [],
    fatture: [],
  });

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(q);
        setData(res);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const tabs = useMemo(() => {
    const list: { key: TabKey; count: number }[] = [];
    if (data.amministratori.length) list.push({ key: "Amministratori", count: data.amministratori.length });
    if (data.clienti.length) list.push({ key: "Clienti", count: data.clienti.length });
    if (data.impianti.length) list.push({ key: "Impianti", count: data.impianti.length });
    if (data.contratti.length) list.push({ key: "Contratti", count: data.contratti.length });
    if (data.interventi.length) list.push({ key: "Interventi", count: data.interventi.length });
    if (data.manutenzioni.length) list.push({ key: "Manutenzioni", count: data.manutenzioni.length });
    if (data.fatture.length) list.push({ key: "Fatture", count: data.fatture.length });
    return list;
  }, [data]);

  useEffect(() => {
    if (tabs.length === 0) {
      setActive(null);
      return;
    }
    if (!active || !tabs.find((t) => t.key === active)) {
      setActive(tabs[0].key);
    }
  }, [tabs, active]);

  const items = useMemo(() => {
    switch (active) {
      case "Amministratori":
        return data.amministratori;
      case "Clienti":
        return data.clienti;
      case "Impianti":
        return data.impianti;
      case "Contratti":
        return data.contratti;
      case "Interventi":
        return data.interventi;
      case "Manutenzioni":
        return data.manutenzioni;
      case "Fatture":
        return data.fatture;
      default:
        return [];
    }
  }, [active, data]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-center">
        <div className="relative h-28 w-96 sm:h-32 sm:w-112">
          <Image
            src="/images/logo-2025.png"
            alt="Nolasco Ascensori Logo"
            fill
            priority
            className="object-contain mix-blend-multiply"
          />
        </div>
      </div>
      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
              Ricerca
            </h1>
            <p className="text-slate-500 text-lg font-medium mt-2">
              Cerca in tutte le sezioni
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca clienti, impianti, contratti, fatture, interventi, manutenzioni..."
                className="h-14 pl-12 text-base md:text-lg rounded-2xl"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-14 rounded-2xl"
              onClick={() => setQ("")}
            >
              <RefreshCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {isPending ? "Ricerca in corso..." : q.trim().length < 2 ? "Inserisci almeno 2 caratteri." : null}
          </div>
        </div>
      </div>

      {tabs.length > 0 ? (
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="flex gap-2 p-4 border-b border-slate-200 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide transition-colors",
                  active === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {t.key} <span className="ml-2 opacity-80">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((it) => {
              const hrefWithReturn = q.trim() ? `${it.href}${it.href.includes("?") ? "&" : "?"}from=home&q=${encodeURIComponent(q.trim())}` : it.href;
              return (
              <Link
                key={it.id}
                href={hrefWithReturn}
                className="block px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">{it.title}</div>
                {it.subtitle ? (
                  <div className="text-sm text-slate-500 mt-1 whitespace-normal break-words">
                    {it.subtitle}
                  </div>
                ) : null}
              </Link>
            );
            })}
          </div>
        </div>
      ) : q.trim().length >= 2 && !isPending ? (
        <div className="text-center text-slate-500 font-medium py-10">
          Nessun risultato.
        </div>
      ) : null}
    </div>
  );
}


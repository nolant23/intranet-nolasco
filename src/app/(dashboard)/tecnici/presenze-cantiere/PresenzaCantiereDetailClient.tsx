"use client";

import Link from "next/link";
import { ArrowLeft, HardHat } from "lucide-react";

type Presenza = {
  id: string;
  data: Date;
  oreCantiere: number;
  descrizione: string | null;
  booking: { id: string; codiceImpianto: string | null; indirizzoImpianto: string | null; comuneImpianto: string | null } | null;
  tecnico: { id: string; name: string | null } | null;
};

type Props = {
  presenza: Presenza;
  /** Link "Indietro" (es. /tecnici/presenze-cantiere o /booking/presenze-cantiere) */
  backHref: string;
  /** Mostra link "Vai al booking" (solo da area booking; nascosto per tecnici) */
  showBookingLink?: boolean;
};

export function PresenzaCantiereDetailClient({ presenza, backHref, showBookingLink = false }: Props) {
  const b = presenza.booking;
  const impiantoLabel = b
    ? [b.codiceImpianto, b.indirizzoImpianto, b.comuneImpianto].filter(Boolean).join(" | ")
    : "-";

  return (
    <div className="flex flex-col gap-6 w-full min-h-0">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="h-5 w-5" /> Indietro
        </Link>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 rounded-xl">
            <HardHat className="h-8 w-8 text-amber-700" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
              Dettaglio presenza cantiere
            </h1>
          </div>
        </div>

        <dl className="grid gap-4 max-w-xl">
          <div>
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Data</dt>
            <dd className="mt-1 text-slate-900 font-medium">
              {new Date(presenza.data).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Tecnico</dt>
            <dd className="mt-1 text-slate-900 font-medium">{presenza.tecnico?.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Ore cantiere</dt>
            <dd className="mt-1 text-slate-900 font-medium">{presenza.oreCantiere}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Cantiere / Impianto</dt>
            <dd className="mt-1 text-slate-900 font-medium">{impiantoLabel}</dd>
            {showBookingLink && b?.id && (
              <dd className="mt-1">
                <Link
                  href={`/booking/${b.id}`}
                  className="text-primary font-semibold hover:underline"
                >
                  Vai al booking →
                </Link>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Descrizione</dt>
            <dd className="mt-1 text-slate-900 whitespace-pre-wrap">{presenza.descrizione ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

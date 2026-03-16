"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChiudiButton } from "@/components/ChiudiButton";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, FileText } from "lucide-react";
import { formatEuro } from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FatturaDetailView } from "@/app/(dashboard)/fatture/components/FatturaDetailView";
import { getFatturaByFicId } from "@/app/(dashboard)/fatture/actions";
import { deleteBooking } from "../actions";

type Perms = { READ?: boolean; CREATE?: boolean; UPDATE?: boolean; DELETE?: boolean } | undefined;

function formatDataDDMMYYYY(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statoFatturaBadge(stato: string | null | undefined): { label: string; className: string } | null {
  if (!stato) return null;
  const s = String(stato).toUpperCase();
  if (s === "SALDATO") return { label: "PAGATO", className: "bg-green-100 text-green-800 border-green-200" };
  if (s === "PARZIALE") return { label: "ACCONTO", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "DA PAGARE", className: "bg-red-100 text-red-800 border-red-200" };
}

/** Calcola importo pagato e da pagare dalla fattura (pagamentiJson). Se non c’è fattura usa importoPagato della condizione. */
function getPagatoDaPagare(cp: any): { pagato: number; daPagare: number } {
  if (cp.fattura?.pagamentiJson != null && cp.fattura?.importoTotale != null) {
    let pagato = 0;
    try {
      const list = JSON.parse(cp.fattura.pagamentiJson);
      if (Array.isArray(list)) {
        for (const p of list) {
          if (p.status === "paid") pagato += Number(p.amount) || 0;
        }
      }
    } catch {
      /* ignore */
    }
    const totale = Number(cp.fattura.importoTotale) || 0;
    const daPagare = Math.max(0, totale - pagato);
    return { pagato, daPagare };
  }
  const imp = Number(cp.importo) || 0;
  const pagatoCond = Number(cp.importoPagato) || 0;
  return { pagato: pagatoCond, daPagare: Math.max(0, imp - pagatoCond) };
}

export function BookingDetailClient({ booking, permissions }: { booking: any; permissions?: Perms }) {
  const router = useRouter();
  const clienti = booking?.clienti ?? [];
  const [openFatturaFicId, setOpenFatturaFicId] = useState<string | null>(null);
  const [dialogFattura, setDialogFattura] = useState<any>(null);
  const [dialogFatturaLoading, setDialogFatturaLoading] = useState(false);

  useEffect(() => {
    if (!openFatturaFicId) {
      setDialogFattura(null);
      return;
    }
    setDialogFatturaLoading(true);
    getFatturaByFicId(openFatturaFicId)
      .then((res) => {
        if (res.success && (res as { data?: any }).data) {
          setDialogFattura((res as { data: any }).data);
        } else {
          setDialogFattura(null);
        }
      })
      .finally(() => setDialogFatturaLoading(false));
  }, [openFatturaFicId]);

  const handleDelete = async () => {
    if (!booking?.id || !confirm("Eliminare questo booking?")) return;
    const res = await deleteBooking(booking.id);
    if (res?.success) router.push("/booking/commesse");
    else alert(res?.error);
  };

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Dettaglio Booking
          </h1>
          <p className="text-slate-500 font-medium mt-1">Numero impianto: {booking?.codiceImpianto}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {permissions?.UPDATE && (
            <Link
              href={`/booking/${booking?.id}/modifica`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
            >
              <Pencil className="h-4 w-4" /> Modifica
            </Link>
          )}
          {permissions?.DELETE && (
            <Button variant="outline" size="lg" onClick={handleDelete} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Elimina
            </Button>
          )}
          <ChiudiButton listPath="/booking/commesse" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Impianto e indirizzo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numero impianto</div>
            <div className="text-lg font-black text-slate-900 mt-1">{booking?.codiceImpianto ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Indirizzo</div>
            <div className="font-semibold text-slate-900 mt-1">
              {(() => {
                const ind = booking?.indirizzoImpianto?.trim();
                const cap = booking?.capImpianto?.trim();
                const comune = booking?.comuneImpianto?.trim();
                const prov = booking?.provinciaImpianto?.trim();
                const località = [cap, comune].filter(Boolean).join(" ");
                const conProvincia = località + (prov ? ` (${prov})` : "");
                if (!ind && !conProvincia.trim()) return "-";
                if (!ind) return conProvincia;
                if (!conProvincia.trim()) return ind;
                return `${ind} – ${conProvincia}`;
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Clienti (ficId)</h2>
        {clienti.length === 0 ? (
          <p className="text-slate-500">Nessun cliente collegato.</p>
        ) : (
          <ul className="space-y-2">
            {clienti.map((bc: any) => (
              <li key={bc.id}>
                <Link
                  href={`/clienti/${bc.cliente?.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {bc.cliente?.denominazione ?? bc.clienteId}
                </Link>
                {bc.cliente?.ficId && (
                  <span className="text-slate-500 text-sm ml-2">(ficId: {bc.cliente.ficId})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Condizioni di pagamento</h2>
        {(!booking?.condizioniPagamento || booking.condizioniPagamento.length === 0) ? (
          <p className="text-slate-500">Nessuna condizione di pagamento.</p>
        ) : (
          <>
            {/* Mobile: card per condizione */}
            <div className="md:hidden space-y-3">
              {booking.condizioniPagamento.map((cp: any) => {
                const { pagato, daPagare } = getPagatoDaPagare(cp);
                const badge = cp.fattura ? statoFatturaBadge(cp.fattura.stato) : null;
                return (
                  <div key={cp.id} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900 mb-3">{cp.condizione}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-slate-500">Importo</span>
                      <span className="text-right font-medium tabular-nums">{formatEuro(cp.importo)}</span>
                      <span className="text-slate-500">Pagato</span>
                      <span className="text-right font-medium tabular-nums text-green-700">{formatEuro(pagato)}</span>
                      <span className="text-slate-500">Da pagare</span>
                      <span className="text-right font-medium tabular-nums">{formatEuro(daPagare)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      {cp.fattura ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOpenFatturaFicId(cp.fattura.ficId)}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              N. {cp.fattura.numero}
                            </button>
                            <span className="text-slate-500 text-xs">{formatDataDDMMYYYY(cp.fattura.data)}</span>
                            <span className="text-slate-700 font-medium">{formatEuro(cp.fattura.importoTotale)}</span>
                            {badge && (
                              <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold", badge.className)}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {cp.fattura.oggetto && (
                            <p className="text-xs text-slate-500 truncate" title={cp.fattura.oggetto}>{cp.fattura.oggetto}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setOpenFatturaFicId(cp.fattura.ficId)}
                            >
                              Dettaglio
                            </Button>
                            {cp.fattura.urlDocumento ? (
                              <a
                                href={cp.fattura.urlDocumento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs inline-flex items-center")}
                              >
                                <FileText className="h-3.5 w-3.5" /> PDF
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : cp.fatturaFicId ? (
                        <button
                          type="button"
                          onClick={() => setOpenFatturaFicId(cp.fatturaFicId)}
                          className="text-slate-500 hover:underline text-sm"
                        >
                          ficId: {cp.fatturaFicId}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabella */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3.5 px-4 font-bold text-slate-600 uppercase tracking-wider w-[35%]">Condizione</th>
                  <th className="text-right py-3.5 px-4 font-bold text-slate-600 uppercase tracking-wider w-[12%]">Importo</th>
                  <th className="text-right py-3.5 px-4 font-bold text-slate-600 uppercase tracking-wider w-[12%]">Pagato</th>
                  <th className="text-right py-3.5 px-4 font-bold text-slate-600 uppercase tracking-wider w-[12%]">Da pagare</th>
                  <th className="text-left py-3.5 px-4 font-bold text-slate-600 uppercase tracking-wider">Fattura</th>
                </tr>
              </thead>
              <tbody>
                {booking.condizioniPagamento.map((cp: any, idx: number) => {
                  const { pagato, daPagare } = getPagatoDaPagare(cp);
                  return (
                  <tr key={cp.id} className={cn("border-b border-slate-100 last:border-b-0", idx % 2 === 1 && "bg-slate-50/50")}>
                    <td className="py-3 px-4 align-middle">
                      <span className="font-medium text-slate-900">{cp.condizione}</span>
                    </td>
                    <td className="py-3 px-4 text-right align-middle font-semibold text-slate-900 tabular-nums">
                      {formatEuro(cp.importo)}
                    </td>
                    <td className="py-3 px-4 text-right align-middle font-medium text-slate-900 tabular-nums">
                      {formatEuro(pagato)}
                    </td>
                    <td className="py-3 px-4 text-right align-middle font-medium text-slate-900 tabular-nums">
                      {formatEuro(daPagare)}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {cp.fattura ? (
                        (() => {
                          const badge = statoFatturaBadge(cp.fattura.stato);
                          return (
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                              <button
                                type="button"
                                onClick={() => setOpenFatturaFicId(cp.fattura.ficId)}
                                className="text-blue-600 hover:underline font-semibold text-base shrink-0"
                              >
                                N. {cp.fattura.numero}
                              </button>
                              <span className="text-slate-500 text-xs shrink-0">{formatDataDDMMYYYY(cp.fattura.data)}</span>
                              <span className="text-slate-700 font-medium shrink-0">{formatEuro(cp.fattura.importoTotale)}</span>
                              {badge && (
                                <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0", badge.className)}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            {cp.fattura.oggetto && (
                              <p className="text-xs text-slate-500 mt-1 truncate max-w-xl" title={cp.fattura.oggetto}>
                                {cp.fattura.oggetto}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setOpenFatturaFicId(cp.fattura.ficId)}
                            >
                              Dettaglio
                            </Button>
                            {cp.fattura.urlDocumento ? (
                              <a
                                href={cp.fattura.urlDocumento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
                              >
                                <FileText className="h-3.5 w-3.5" /> PDF
                              </a>
                            ) : null}
                          </div>
                        </div>
                          );
                        })()
                      ) : cp.fatturaFicId ? (
                        <button
                          type="button"
                          onClick={() => setOpenFatturaFicId(cp.fatturaFicId)}
                          className="text-slate-500 hover:text-slate-700 hover:underline text-left"
                        >
                          ficId: {cp.fatturaFicId}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Dati contratto e montaggio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data contratto</div>
            <div className="font-semibold text-slate-900 mt-1">
              {booking?.dataContratto ? new Date(booking.dataContratto).toLocaleDateString("it-IT") : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipologia</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.tipologiaImpianto ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modello</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.modelloImpianto ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stato materiali</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.statoMateriali ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Montaggio (€)</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.montaggio != null ? formatEuro(booking.montaggio) : "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stato montaggio</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.statoMontaggio ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inizio montaggio</div>
            <div className="font-semibold text-slate-900 mt-1">
              {booking?.inizioMontaggio ? new Date(booking.inizioMontaggio).toLocaleDateString("it-IT") : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fine montaggio</div>
            <div className="font-semibold text-slate-900 mt-1">
              {booking?.fineMontaggio ? new Date(booking.fineMontaggio).toLocaleDateString("it-IT") : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progettazione (€)</div>
            <div className="font-semibold text-slate-900 mt-1">{booking?.progettazione != null ? formatEuro(booking.progettazione) : "-"}</div>
          </div>
        </div>
        {(booking?.contrattoFirmatoUrl || booking?.disegnoDefinitivoUrl || booking?.dm37Url) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link</div>
            <div className="flex flex-wrap gap-2">
              {booking.contrattoFirmatoUrl && (
                <a href={booking.contrattoFirmatoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Contratto firmato</a>
              )}
              {booking.disegnoDefinitivoUrl && (
                <a href={booking.disegnoDefinitivoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Disegno definitivo</a>
              )}
              {booking.dm37Url && (
                <a href={booking.dm37Url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">DM37</a>
              )}
            </div>
          </div>
        )}
        {(booking?.enteNotificato || booking?.nAttestato) && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ente notificato</div>
              <div className="font-semibold text-slate-900 mt-1">{booking?.enteNotificato ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N. Attestato</div>
              <div className="font-semibold text-slate-900 mt-1">{booking?.nAttestato ?? "-"}</div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!openFatturaFicId} onOpenChange={(open) => !open && setOpenFatturaFicId(null)}>
        <DialogContent className="w-[95vw] max-w-5xl sm:w-[90vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Dettaglio fattura</DialogTitle>
          </DialogHeader>
          {dialogFatturaLoading ? (
            <div className="p-8 text-center text-slate-500">Caricamento...</div>
          ) : dialogFattura ? (
            <div className="overflow-y-auto flex-1 min-h-0">
              <FatturaDetailView
                fattura={dialogFattura}
                permissions={{ READ: true }}
                onClose={() => setOpenFatturaFicId(null)}
                isStandalone={false}
              />
            </div>
          ) : openFatturaFicId ? (
            <div className="p-8 text-center text-slate-500">Fattura non trovata.</div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

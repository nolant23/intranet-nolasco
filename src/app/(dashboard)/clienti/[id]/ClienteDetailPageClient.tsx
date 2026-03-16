"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDigit, CalendarDays, Wrench, ClipboardList, FileCheck } from "lucide-react";
import "@/components/table/grid-table.css";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { getFatturaById } from "@/app/(dashboard)/fatture/actions";
import { getImpiantoDetail } from "@/app/(dashboard)/impianti/actions";
import { FatturaDetailView } from "@/app/(dashboard)/fatture/components/FatturaDetailView";
import { ImpiantoDetailDialogContent } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialogContent";
import { formatEuro } from "@/lib/money";
import { ChiudiButton } from "@/components/ChiudiButton";

const formatCurrency = (value: number) => formatEuro(value);
const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("it-IT");

function tipologiaBadgeClass(tipologia: string) {
  const m: Record<string, string> = {
    "Persona Fisica": "bg-sky-100 text-sky-800",
    Azienda: "bg-emerald-100 text-emerald-800",
    Condominio: "bg-amber-100 text-amber-800",
    PA: "bg-violet-100 text-violet-800",
  };
  return m[tipologia] || "bg-slate-100 text-slate-800";
}

function renderStatoFatturaBadge(stato?: string | null) {
  if (stato === "STORNATO")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
        Stornato
      </span>
    );
  if (stato === "PARZ. STORNATO")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        Parz. Stornato
      </span>
    );
  if (stato === "SALDATO")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
        Saldato
      </span>
    );
  if (stato === "PARZIALE")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
        Parziale
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
      Da Saldare
    </span>
  );
}

function ClienteDetailPageClientInner({
  cliente,
  permissionsFatture,
}: {
  cliente: any;
  permissionsFatture: any;
}) {
  const [selectedFattura, setSelectedFattura] = useState<any | null>(null);
  const [loadingFattura, setLoadingFattura] = useState(false);
  const [selectedImpiantoId, setSelectedImpiantoId] = useState<string | null>(null);
  const [impiantoDetail, setImpiantoDetail] = useState<any | null>(null);
  const [loadingImpianto, setLoadingImpianto] = useState(false);

  useEffect(() => {
    if (!selectedImpiantoId) {
      setImpiantoDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingImpianto(true);
    getImpiantoDetail(selectedImpiantoId).then((res) => {
      if (cancelled) return;
      setLoadingImpianto(false);
      if (res?.success && res.impianto) setImpiantoDetail(res.impianto);
      else setImpiantoDetail(null);
    });
    return () => { cancelled = true; };
  }, [selectedImpiantoId]);

  if (!cliente) return null;

  const handleOpenFattura = async (fatturaId: string) => {
    setLoadingFattura(true);
    const res = await getFatturaById(fatturaId);
    setLoadingFattura(false);
    if (res?.success && (res as any).data) {
      setSelectedFattura((res as any).data);
    } else {
      alert("Impossibile caricare la fattura.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 w-full p-2">
        <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase min-w-0">
            Dettaglio Cliente
          </h1>
          <div className="shrink-0">
            <ChiudiButton listPath="/clienti" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Denominazione</p>
              <p className="text-lg font-black text-slate-900">{cliente.denominazione}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipologia</p>
              <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${tipologiaBadgeClass(cliente.tipologia)}`}>
                {cliente.tipologia}
              </span>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indirizzo</p>
              <p className="font-medium text-slate-800">
                {cliente.indirizzo} — {cliente.comune} ({cliente.provincia}) {cliente.cap}
              </p>
            </div>
            {(cliente.cellulare || cliente.email || cliente.pec) && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contatti</p>
                {cliente.cellulare && <p className="font-medium text-slate-800">{cliente.cellulare}</p>}
                {cliente.email && <p className="text-sm text-slate-600">{cliente.email}</p>}
                {cliente.pec && <p className="text-sm text-slate-600">{cliente.pec}</p>}
              </div>
            )}
            {cliente.ficId && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FiC ID</p>
                <p className="font-mono text-sm text-slate-700">{cliente.ficId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabelle relazionali: griglia 2 colonne (2 vicine, se 3: due vicine + una intera, se 4+: a coppie) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fatture collegate */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-500" /> Fatture collegate
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(cliente.fatture) ? cliente.fatture.length : 0}
              </span>
            </div>
            {!Array.isArray(cliente.fatture) || cliente.fatture.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessuna fattura collegata.</div>
            ) : (
              <div className="grid-table-card overflow-hidden">
                <div className="md:hidden space-y-3">
                  {cliente.fatture.map((f: any) => (
                    <div
                      key={f.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenFattura(f.id)}
                      className="grid-table-mobile-card cursor-pointer"
                    >
                      <div className="grid-table-mobile-card__label">Data</div>
                      <div className="grid-table-mobile-card__value">{formatDate(f.data)}</div>
                      <div className="grid-table-mobile-card__label">Numero</div>
                      <div className="grid-table-mobile-card__value font-black text-blue-700">{f.numero}</div>
                      <div className="grid-table-mobile-card__label">Totale · Stato</div>
                      <div className="grid-table-mobile-card__value">{formatCurrency(f.importoTotale)} · {renderStatoFatturaBadge(f.stato)}</div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                    <div className="grid-table__head" style={{ gridTemplateColumns: "110px 120px 1fr 130px 140px" }} role="row">
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Data</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Numero</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Oggetto</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--right">Totale</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700 grid-table__cell--center">Stato</div>
                    </div>
                    <div className="grid-table__body">
                      {cliente.fatture.map((f: any) => (
                        <div
                          key={f.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenFattura(f.id)}
                          className="grid-table__row cursor-pointer"
                          style={{ gridTemplateColumns: "110px 120px 1fr 130px 140px" }}
                        >
                          <div className="grid-table__cell py-4 font-medium text-slate-800">{formatDate(f.data)}</div>
                          <div className="grid-table__cell py-4 font-black text-blue-700">{f.numero}</div>
                          <div className="grid-table__cell py-4 text-slate-700 whitespace-normal break-words">{f.oggetto || "-"}</div>
                          <div className="grid-table__cell py-4 font-black text-slate-900 grid-table__cell--right">{formatCurrency(f.importoTotale)}</div>
                          <div className="grid-table__cell py-4 grid-table__cell--center">{renderStatoFatturaBadge(f.stato)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Impianti collegati */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileDigit className="w-4 h-4 text-slate-500" /> Impianti collegati
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(cliente.impianti) ? cliente.impianti.length : 0}
              </span>
            </div>
            {!Array.isArray(cliente.impianti) || cliente.impianti.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessun impianto collegato.</div>
            ) : (
              <div className="grid-table-card overflow-hidden">
                <div className="md:hidden space-y-3">
                  {cliente.impianti.map((imp: any) => (
                    <div
                      key={imp.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedImpiantoId(imp.id)}
                      className="grid-table-mobile-card cursor-pointer"
                    >
                      <div className="grid-table-mobile-card__label">N° Impianto</div>
                      <div className="grid-table-mobile-card__value font-black">{imp.numeroImpianto || "-"}</div>
                      <div className="grid-table-mobile-card__label">Indirizzo</div>
                      <div className="grid-table-mobile-card__value text-slate-800">{imp.indirizzo}</div>
                      <div className="grid-table-mobile-card__label">Comune</div>
                      <div className="grid-table-mobile-card__value">{imp.comune} ({imp.provincia || "-"}) {imp.cap ? `— ${imp.cap}` : ""}</div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                    <div className="grid-table__head" style={{ gridTemplateColumns: "140px 1fr 180px" }} role="row">
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">N° Impianto</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Indirizzo</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Comune</div>
                    </div>
                    <div className="grid-table__body">
                      {cliente.impianti.map((imp: any) => (
                        <div
                          key={imp.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedImpiantoId(imp.id)}
                          className="grid-table__row cursor-pointer"
                          style={{ gridTemplateColumns: "140px 1fr 180px" }}
                        >
                          <div className="grid-table__cell py-4 font-black text-slate-900">{imp.numeroImpianto || "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-800 whitespace-normal break-words">{imp.indirizzo}</div>
                          <div className="grid-table__cell py-4 text-slate-800">{imp.comune} ({imp.provincia || "-"}) {imp.cap ? `— ${imp.cap}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contratti collegati (tramite impianti) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" /> Contratti collegati
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(cliente.contratti) ? cliente.contratti.length : 0}
              </span>
            </div>
            {!Array.isArray(cliente.contratti) || cliente.contratti.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessun contratto collegato.</div>
            ) : (
              <div className="grid-table-card overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                    <div className="grid-table__head" style={{ gridTemplateColumns: "120px 1fr 1fr" }} role="row">
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">N° Contratto</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Stato</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Impianto</div>
                    </div>
                    <div className="grid-table__body">
                      {cliente.contratti.map((c: any) => (
                        <div key={c.id} className="grid-table__row" style={{ gridTemplateColumns: "120px 1fr 1fr" }}>
                          <div className="grid-table__cell py-4">
                            <Link href={`/contratti/${c.id}`} className="font-black text-blue-700 hover:underline">
                              {c.numero || c.id.slice(0, 8)}
                            </Link>
                          </div>
                          <div className="grid-table__cell py-4 text-slate-800 font-medium">{c.statoContratto || "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-700 text-sm">{c.impianto ? `${c.impianto.numeroImpianto || "-"} — ${c.impianto.indirizzo || ""}` : "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interventi collegati (tramite impianti) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-500" /> Interventi collegati
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(cliente.interventi) ? cliente.interventi.length : 0}
              </span>
            </div>
            {!Array.isArray(cliente.interventi) || cliente.interventi.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessun intervento collegato.</div>
            ) : (
              <div className="grid-table-card overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                    <div className="grid-table__head" style={{ gridTemplateColumns: "100px 100px 1fr 120px" }} role="row">
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Data</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">N° Rapportino</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Impianto</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Tecnico</div>
                    </div>
                    <div className="grid-table__body">
                      {cliente.interventi.map((it: any) => (
                        <div key={it.id} className="grid-table__row" style={{ gridTemplateColumns: "100px 100px 1fr 120px" }}>
                          <div className="grid-table__cell py-4">
                            <Link href={`/interventi/${it.id}`} className="font-medium text-blue-700 hover:underline">
                              {formatDate(it.dataIntervento)}
                            </Link>
                          </div>
                          <div className="grid-table__cell py-4 text-slate-800">{it.numeroRapportino || "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-700 text-sm truncate">{it.impianto ? `${it.impianto.numeroImpianto || "-"} — ${it.impianto.indirizzo || ""}` : "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-800">{it.tecnico?.name || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manutenzioni collegate (tramite impianti) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-500" /> Manutenzioni collegate
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(cliente.manutenzioni) ? cliente.manutenzioni.length : 0}
              </span>
            </div>
            {!Array.isArray(cliente.manutenzioni) || cliente.manutenzioni.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessuna manutenzione collegata.</div>
            ) : (
              <div className="grid-table-card overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                    <div className="grid-table__head" style={{ gridTemplateColumns: "120px 1fr 140px 160px" }} role="row">
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Data</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Impianto</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Tecnico</div>
                      <div className="grid-table__head-cell py-4 font-bold text-slate-700">Cliente firmatario</div>
                    </div>
                    <div className="grid-table__body">
                      {cliente.manutenzioni.map((m: any) => (
                        <div key={m.id} className="grid-table__row" style={{ gridTemplateColumns: "120px 1fr 140px 160px" }}>
                          <div className="grid-table__cell py-4">
                            <Link href={`/manutenzioni/${m.id}`} className="font-medium text-blue-700 hover:underline">
                              {formatDate(m.dataManutenzione)}
                            </Link>
                          </div>
                          <div className="grid-table__cell py-4 text-slate-700 text-sm">{m.impianto ? `${m.impianto.numeroImpianto || "-"} — ${m.impianto.indirizzo || ""}` : "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-800">{m.tecnico?.name || "-"}</div>
                          <div className="grid-table__cell py-4 text-slate-800 text-sm">{m.clienteFirmatario || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedFattura} onOpenChange={(open) => !open && setSelectedFattura(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedFattura && (
            <FatturaDetailView
              fattura={selectedFattura}
              permissions={permissionsFatture}
              onClose={() => setSelectedFattura(null)}
              isStandalone={false}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImpiantoId} onOpenChange={(open) => !open && setSelectedImpiantoId(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedImpiantoId && (
            <ImpiantoDetailDialogContent
              detail={impiantoDetail}
              loading={loadingImpianto}
              onClose={() => setSelectedImpiantoId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {loadingFattura && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg">Caricamento fattura...</div>
        </div>
      )}
    </>
  );
}

export const ClienteDetailPageClient = memo(ClienteDetailPageClientInner);
ClienteDetailPageClient.displayName = "ClienteDetailPageClient";

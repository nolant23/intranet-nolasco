"use client";

import { useState, useCallback, memo } from "react";
import Link from "next/link";
import { ChiudiButton } from "@/components/ChiudiButton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import "@/components/table/grid-table.css";
import { ClipboardList, Wrench, FileCheck } from "lucide-react";
import { getClienteDetail } from "@/app/(dashboard)/clienti/actions";
import { getAmministratoreDetail } from "@/app/(dashboard)/amministratori/actions";
import { useDetailQuery } from "@/lib/use-detail-query";

type ClienteOrAmministratoreDetail = {
  denominazione?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null;
  email?: string | null;
};

function ImpiantoDetailClientInner({ d }: { d: any }) {
  const [dialog, setDialog] = useState<{ type: "cliente" | "amministratore"; id: string } | null>(null);

  const fetcher = useCallback(async (): Promise<ClienteOrAmministratoreDetail | null> => {
    if (!dialog) return null;
    if (dialog.type === "cliente") {
      const res = await getClienteDetail(dialog.id);
      return res?.success && (res as { data?: ClienteOrAmministratoreDetail }).data ? (res as { data: ClienteOrAmministratoreDetail }).data : null;
    }
    const res = await getAmministratoreDetail(dialog.id);
    return res?.success && (res as { amministratore?: ClienteOrAmministratoreDetail }).amministratore
      ? (res as { amministratore: ClienteOrAmministratoreDetail }).amministratore
      : null;
  }, [dialog?.type, dialog?.id]);

  const { data, isLoading } = useDetailQuery<ClienteOrAmministratoreDetail | null>(
    dialog ? `detail-${dialog.type}-${dialog.id}` : null,
    dialog ? fetcher : null,
    { enabled: !!dialog }
  );

  const renderDialogContent = () => {
    if (isLoading) return <div className="text-slate-500">Caricamento...</div>;
    const detail = data ?? null;
    if (!detail) return <div className="text-slate-500">Non trovato.</div>;
    if (dialog?.type === "cliente") {
      return (
        <div className="space-y-3">
          {detail.denominazione && <p><span className="font-semibold text-slate-600">Denominazione:</span> {detail.denominazione}</p>}
          {detail.indirizzo && <p><span className="font-semibold text-slate-600">Indirizzo:</span> {detail.indirizzo}</p>}
          {(detail.cap || detail.comune) && <p><span className="font-semibold text-slate-600">Comune:</span> {[detail.cap, detail.comune, detail.provincia].filter(Boolean).join(" ")}</p>}
          {detail.email && <p><span className="font-semibold text-slate-600">Email:</span> {detail.email}</p>}
          <div className="pt-4">
            <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={() => setDialog(null)}>Chiudi</button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {detail.denominazione && <p><span className="font-semibold text-slate-600">Denominazione:</span> {detail.denominazione}</p>}
        {detail.indirizzo && <p><span className="font-semibold text-slate-600">Indirizzo:</span> {detail.indirizzo}</p>}
        {(detail.cap || detail.comune) && <p><span className="font-semibold text-slate-600">Comune:</span> {[detail.cap, detail.comune, detail.provincia].filter(Boolean).join(" ")}</p>}
        {detail.email && <p><span className="font-semibold text-slate-600">Email:</span> {detail.email}</p>}
        <div className="pt-4">
          <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={() => setDialog(null)}>Chiudi</button>
        </div>
      </div>
    );
  };

  const dialogTitle = dialog?.type === "cliente" ? "Dettaglio Cliente" : "Dettaglio Amministratore";

  return (
    <>
      <div className="flex flex-col gap-6 w-full p-2">
        <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase min-w-0">
            Dettaglio Impianto
          </h1>
          <div className="shrink-0">
            <ChiudiButton listPath="/impianti" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {d.numeroImpianto ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N° Impianto</div>
                <div className="text-lg font-black text-slate-900 mt-1">{d.numeroImpianto}</div>
              </div>
            ) : null}
            {d.tipologia ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipologia</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{d.tipologia}</div>
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Indirizzo</div>
              <div className="text-base font-semibold text-slate-900 mt-1 whitespace-normal break-words">
                {d.indirizzo}
                {(d.cap || d.comune || d.provincia) ? (
                  <div className="text-sm text-slate-500 font-medium mt-1">
                    {d.cap ? `${d.cap} ` : ""}{d.comune || ""}{d.provincia ? ` (${d.provincia})` : ""}
                  </div>
                ) : null}
              </div>
            </div>
            {d.cliente?.denominazione ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</div>
                <button type="button" onClick={() => setDialog({ type: "cliente", id: d.cliente.id })} className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block text-left">
                  {d.cliente.denominazione}
                </button>
              </div>
            ) : null}
            {d.amministratore?.denominazione ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amministratore</div>
                <button type="button" onClick={() => setDialog({ type: "amministratore", id: d.amministratore.id })} className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block text-left">
                  {d.amministratore.denominazione}
                </button>
              </div>
            ) : null}
            {d.matricola ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matricola</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{d.matricola}</div>
              </div>
            ) : null}
            {d.numeroFabbrica ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numero di fabbrica</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{d.numeroFabbrica}</div>
              </div>
            ) : null}
            {d.enteNotificato ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ente notificato</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{d.enteNotificato}</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tabelle relazionali: 2 colonne (2 vicine + 1 intera) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contratti collegati */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" /> Contratti collegati
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(d.contratti) ? d.contratti.length : 0}
              </span>
            </div>
            {!Array.isArray(d.contratti) || d.contratti.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessun contratto collegato.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid-table__scroll w-full" style={{ maxHeight: "none" }} role="table">
                  <div className="grid-table__head" style={{ gridTemplateColumns: "1fr 120px" }} role="row">
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">N° Contratto</div>
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Stato</div>
                  </div>
                  <div className="grid-table__body">
                    {d.contratti.map((c: any) => (
                      <div key={c.id} className="grid-table__row" style={{ gridTemplateColumns: "1fr 120px" }} role="row">
                        <div className="grid-table__cell py-3">
                          <Link href={`/contratti/${c.id}`} className="font-semibold text-blue-700 hover:underline">
                            {c.numero || c.id.slice(0, 8)}
                          </Link>
                        </div>
                        <div className="grid-table__cell py-3 text-slate-800">{c.statoContratto || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interventi collegati */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-500" /> Interventi collegati
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(d.interventi) ? d.interventi.length : 0}
              </span>
            </div>
            {!Array.isArray(d.interventi) || d.interventi.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessun intervento collegato.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                  <div className="grid-table__head" style={{ gridTemplateColumns: "100px 1fr 120px" }} role="row">
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Data</div>
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">N° Rapportino</div>
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Tecnico</div>
                  </div>
                  <div className="grid-table__body">
                    {d.interventi.map((it: any) => (
                      <div key={it.id} className="grid-table__row" style={{ gridTemplateColumns: "100px 1fr 120px" }} role="row">
                        <div className="grid-table__cell py-3">
                          <Link href={`/interventi/${it.id}`} className="font-medium text-blue-700 hover:underline">
                            {new Date(it.dataIntervento).toLocaleDateString("it-IT")}
                          </Link>
                        </div>
                        <div className="grid-table__cell py-3 text-slate-800">{it.numeroRapportino || "-"}</div>
                        <div className="grid-table__cell py-3 text-slate-800">{it.tecnico?.name || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manutenzioni collegate (intera larghezza) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-500" /> Manutenzioni collegate
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Totale: {Array.isArray(d.manutenzioni) ? d.manutenzioni.length : 0}
              </span>
            </div>
            {!Array.isArray(d.manutenzioni) || d.manutenzioni.length === 0 ? (
              <div className="text-slate-600 font-medium">Nessuna manutenzione collegata.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                  <div className="grid-table__head" style={{ gridTemplateColumns: "120px 140px 1fr" }} role="row">
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Data</div>
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Tecnico</div>
                    <div className="grid-table__head-cell py-3 font-bold text-slate-700">Cliente firmatario</div>
                  </div>
                  <div className="grid-table__body">
                    {d.manutenzioni.map((m: any) => (
                      <div key={m.id} className="grid-table__row" style={{ gridTemplateColumns: "120px 140px 1fr" }} role="row">
                        <div className="grid-table__cell py-3">
                          <Link href={`/manutenzioni/${m.id}`} className="font-medium text-blue-700 hover:underline">
                            {new Date(m.dataManutenzione).toLocaleDateString("it-IT")}
                          </Link>
                        </div>
                        <div className="grid-table__cell py-3 text-slate-800">{m.tecnico?.name || "-"}</div>
                        <div className="grid-table__cell py-3 text-slate-800 text-sm">{m.clienteFirmatario || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{dialogTitle}</h3>
            {renderDialogContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ImpiantoDetailClient = memo(ImpiantoDetailClientInner);
ImpiantoDetailClient.displayName = "ImpiantoDetailClient";

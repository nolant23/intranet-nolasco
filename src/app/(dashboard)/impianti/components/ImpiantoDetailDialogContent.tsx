"use client";

import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export function ImpiantoDetailDialogContent({
  detail,
  loading,
  onClose,
}: {
  detail: any | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col max-h-[90vh]">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <Building2 className="w-5 h-5 text-blue-500" />
          Dettaglio Impianto
          {detail?.numeroImpianto ? `: ${detail.numeroImpianto}` : ""}
        </h2>
      </div>

      <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
        {loading ? (
          <div className="text-slate-500 py-8">Caricamento...</div>
        ) : !detail ? (
          <div className="text-slate-500 py-8">Impianto non trovato.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {detail.numeroImpianto && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">N° Impianto</p>
                  <p className="font-semibold text-slate-900">{detail.numeroImpianto}</p>
                </div>
              )}
              {detail.tipologia && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipologia</p>
                  <p className="font-semibold text-slate-900">{detail.tipologia}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                Ubicazione
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
                {detail.indirizzo && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Indirizzo</p>
                    <p className="font-medium text-slate-900 whitespace-normal break-words">{detail.indirizzo}</p>
                  </div>
                )}
                {(detail.cap || detail.comune || detail.provincia) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {detail.cap && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">CAP</p>
                        <p className="font-medium text-slate-900">{detail.cap}</p>
                      </div>
                    )}
                    {detail.comune && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Comune</p>
                        <p className="font-medium text-slate-900">{detail.comune}</p>
                      </div>
                    )}
                    {detail.provincia && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Provincia</p>
                        <p className="font-medium text-slate-900">{detail.provincia}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                Riferimenti
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
                {detail.cliente?.denominazione && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Cliente</p>
                    <p className="font-medium text-slate-900">{detail.cliente.denominazione}</p>
                  </div>
                )}
                {detail.amministratore?.denominazione && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Amministratore</p>
                    <p className="font-medium text-slate-900">{detail.amministratore.denominazione}</p>
                  </div>
                )}
                {!detail.cliente?.denominazione && !detail.amministratore?.denominazione && (
                  <p className="text-sm text-slate-500">Nessun riferimento</p>
                )}
              </div>
            </div>

            {(detail.matricola || detail.numeroFabbrica || detail.enteNotificato) && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                  Altri dati
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {detail.matricola && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Matricola</p>
                      <p className="font-medium text-slate-900">{detail.matricola}</p>
                    </div>
                  )}
                  {detail.numeroFabbrica && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Numero di fabbrica</p>
                      <p className="font-medium text-slate-900">{detail.numeroFabbrica}</p>
                    </div>
                  )}
                  {detail.enteNotificato && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Ente notificato</p>
                      <p className="font-medium text-slate-900">{detail.enteNotificato}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={onClose}>
          Chiudi
        </Button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Undo2, CalendarDays, Briefcase, Info, EuroIcon } from "lucide-react";
import { formatEuro } from "@/lib/money";

const formatCurrency = (value: number) => formatEuro(value);
const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("it-IT");

export function NotaCreditoDetailView({
  nota,
  onClose,
  onOpenFattura,
  isStandalone = false,
}: {
  nota: any;
  onClose: () => void;
  onOpenFattura?: (id: string) => void;
  isStandalone?: boolean;
}) {
  if (!nota) return null;

  return (
    <div
      className={
        isStandalone
          ? "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          : ""
      }
    >
      {/* Header uguale a Fattura: titolo a sinistra, Apri PDF + Chiudi a destra */}
      <div
        className={
          isStandalone
            ? "px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between gap-4"
            : "px-6 py-4 bg-slate-50 border-b border-slate-100"
        }
      >
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 min-w-0">
          <Undo2 className="w-5 h-5 text-blue-500 shrink-0" />
          Dettaglio Nota di Credito: {nota.numero}
        </h2>
        {isStandalone && (
          <div className="flex flex-row items-center gap-2 shrink-0">
            {nota?.urlDocumento && (
              <Button
                onClick={() => window.open(nota.urlDocumento, "_blank")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Apri PDF
              </Button>
            )}
            <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
              Chiudi
            </Button>
          </div>
        )}
      </div>

      <div
        className={
          isStandalone
            ? "px-6 py-5 max-h-[calc(100vh-220px)] overflow-y-auto"
            : "px-6 py-5 max-h-[70vh] overflow-y-auto"
        }
      >
        <div className="space-y-6">
          {/* Prima riga: Data Emissione + Fattura di Riferimento (come Fattura: Data + Scadenza) */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Data Emissione
              </p>
              <p className="font-medium text-slate-800">{formatDate(nota.data)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Fattura di Riferimento
              </p>
              <p className="font-medium text-slate-800">
                {nota.fattura ? `Fatt. n° ${nota.fattura.numero}` : "-"}
              </p>
              {nota.fattura?.data && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Emessa il {formatDate(nota.fattura.data)}
                </p>
              )}
              {nota.fattura?.id &&
                (onOpenFattura ? (
                  <button
                    type="button"
                    onClick={() => onOpenFattura(nota.fattura.id)}
                    className="inline-block mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 text-left"
                  >
                    Vai al dettaglio fattura
                  </button>
                ) : (
                  <Link
                    href={`/fatture/${nota.fattura.id}`}
                    className="inline-block mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
                  >
                    Vai al dettaglio fattura
                  </Link>
                ))}
            </div>
          </div>

          {/* Dati Cliente e Info Aggiuntive affiancate come in Fattura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={!(nota.oggetto || nota.note) ? "md:col-span-2" : ""}>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" /> Dati Cliente
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
                <div>
                  <p className="text-xs text-slate-500">Denominazione</p>
                  <p className="font-bold text-slate-900">{nota.clienteNome}</p>
                </div>
                {nota.clienteIndirizzo && (
                  <div>
                    <p className="text-xs text-slate-500">Indirizzo</p>
                    <p className="text-sm text-slate-700">{nota.clienteIndirizzo}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {nota.clientePartitaIva && (
                    <div>
                      <p className="text-xs text-slate-500">P.IVA</p>
                      <p className="text-sm text-slate-700 font-mono">
                        {nota.clientePartitaIva}
                      </p>
                    </div>
                  )}
                  {nota.clienteCodiceFiscale && (
                    <div>
                      <p className="text-xs text-slate-500">Cod. Fiscale</p>
                      <p className="text-sm text-slate-700 font-mono">
                        {nota.clienteCodiceFiscale}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(nota.oggetto || nota.note) && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" /> Info Aggiuntive
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  {nota.oggetto && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Oggetto</p>
                      <p className="text-sm text-slate-700">{nota.oggetto}</p>
                    </div>
                  )}
                  {nota.note && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Note</p>
                      <div
                        className="prose prose-sm max-w-none text-slate-700 [&_*]:text-slate-700"
                        dangerouslySetInnerHTML={{ __html: nota.note }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dettagli Economici: stesso stile della fattura (card unica, Totale in blu) */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
              <EuroIcon className="w-4 h-4 text-slate-400" /> Dettagli Economici
            </h3>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Imponibile</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(nota.importoNetto)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Imposte (IVA{" "}
                  {nota.importoNetto > 0
                    ? Math.round((nota.importoIva / nota.importoNetto) * 100)
                    : 0}
                  %)
                </span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(nota.importoIva)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-700">
                  Totale Stornato
                </span>
                <span className="text-lg font-black text-blue-600">
                  {formatCurrency(nota.importoTotale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isStandalone && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
            Chiudi
          </Button>
          {nota?.urlDocumento && (
            <Button
              onClick={() => window.open(nota.urlDocumento, "_blank")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Apri PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

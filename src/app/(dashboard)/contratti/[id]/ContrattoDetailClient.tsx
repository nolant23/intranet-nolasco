"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChiudiButton } from "@/components/ChiudiButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getImpiantoDetail } from "@/app/(dashboard)/impianti/actions";
import { getClienteDetail } from "@/app/(dashboard)/clienti/actions";
import { getAmministratoreDetail } from "@/app/(dashboard)/amministratori/actions";
import { ImpiantoDetailDialogContent } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialogContent";
import { formatEuro } from "@/lib/money";
import { Pencil, Trash2, ExternalLink, Wrench, User, Building2, Briefcase } from "lucide-react";
import { ContrattoForm } from "../components/ContrattoForm";
import { deleteContratto } from "../actions";

function getTotale(contratto: any) {
  if (!contratto?.servizi || !Array.isArray(contratto.servizi)) return 0;
  return contratto.servizi.reduce((acc: number, s: any) => (typeof s.importo === "number" ? acc + s.importo : acc), 0);
}

type ContrattoDetailClientProps = {
  c: any;
  impianti: any[];
  contrattiIdImpianto: { id: string; impiantoId: string | null }[];
  permissions: { READ?: boolean; CREATE?: boolean; UPDATE?: boolean; DELETE?: boolean };
};

export function ContrattoDetailClient({ c, impianti, contrattiIdImpianto, permissions }: ContrattoDetailClientProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ type: "impianto" | "cliente" | "amministratore"; id: string } | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const availableImpianti = useMemo(() => {
    const assigned = new Set(contrattiIdImpianto.filter((ct) => ct.id !== c?.id).map((ct) => ct.impiantoId).filter(Boolean));
    return impianti.filter((imp) => imp.id === c?.impiantoId || !assigned.has(imp.id));
  }, [impianti, contrattiIdImpianto, c?.id, c?.impiantoId]);

  useEffect(() => {
    if (!dialog) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const fetchData = async () => {
      if (dialog.type === "impianto") {
        const res = await getImpiantoDetail(dialog.id);
        if (!cancelled) setData(res?.success && res.impianto ? res.impianto : null);
      } else if (dialog.type === "cliente") {
        const res = await getClienteDetail(dialog.id);
        if (!cancelled) setData(res?.success && (res as any).data ? (res as any).data : null);
      } else {
        const res = await getAmministratoreDetail(dialog.id);
        if (!cancelled) setData(res?.success && (res as any).amministratore ? (res as any).amministratore : null);
      }
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [dialog]);

  const renderDialogContent = () => {
    if (dialog?.type === "impianto") {
      return (
        <ImpiantoDetailDialogContent
          detail={data}
          loading={loading}
          onClose={() => setDialog(null)}
        />
      );
    }
    if (loading) return <div className="text-slate-500 p-6">Caricamento...</div>;
    if (!data) return <div className="text-slate-500 p-6">Non trovato.</div>;
    if (dialog?.type === "cliente") {
      return (
        <div className="space-y-3">
          {data.denominazione && <p><span className="font-semibold text-slate-600">Denominazione:</span> {data.denominazione}</p>}
          {data.indirizzo && <p><span className="font-semibold text-slate-600">Indirizzo:</span> {data.indirizzo}</p>}
          {(data.cap || data.comune) && <p><span className="font-semibold text-slate-600">Comune:</span> {[data.cap, data.comune, data.provincia].filter(Boolean).join(" ")}</p>}
          {data.email && <p><span className="font-semibold text-slate-600">Email:</span> {data.email}</p>}
          <div className="pt-4">
            <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={() => setDialog(null)}>Chiudi</button>
          </div>
        </div>
      );
    }
    if (dialog?.type === "amministratore") {
      return (
        <div className="space-y-3">
          {data.denominazione && <p><span className="font-semibold text-slate-600">Denominazione:</span> {data.denominazione}</p>}
          {data.indirizzo && <p><span className="font-semibold text-slate-600">Indirizzo:</span> {data.indirizzo}</p>}
          {(data.cap || data.comune) && <p><span className="font-semibold text-slate-600">Comune:</span> {[data.cap, data.comune, data.provincia].filter(Boolean).join(" ")}</p>}
          {data.email && <p><span className="font-semibold text-slate-600">Email:</span> {data.email}</p>}
          <div className="pt-4">
            <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700" onClick={() => setDialog(null)}>Chiudi</button>
          </div>
        </div>
      );
    }
    return null;
  };

  const dialogTitle = dialog?.type === "impianto" ? "Dettaglio Impianto" : dialog?.type === "cliente" ? "Dettaglio Cliente" : "Dettaglio Amministratore";

  const handleDelete = async () => {
    if (!c?.id || !confirm("Sei sicuro di voler eliminare questo contratto?")) return;
    const res = await deleteContratto(c.id);
    if (res?.success) router.push("/contratti");
  };

  const servizi = Array.isArray(c?.servizi) ? c.servizi : [];
  const totale = getTotale(c);

  return (
    <>
      <div className="flex flex-col gap-6 w-full p-2">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase min-w-0">
            Dettaglio Contratto {c?.numero ? `— ${c.numero}` : ""}
          </h1>
          <div className="shrink-0 flex items-center gap-2">
            {permissions?.UPDATE && (
              <Button variant="outline" size="lg" onClick={() => setEditOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" /> Modifica
              </Button>
            )}
            {permissions?.DELETE && (
              <Button variant="outline" size="lg" onClick={handleDelete} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Elimina
              </Button>
            )}
            <ChiudiButton listPath="/contratti" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
          </div>
        </div>

        {/* Servizi inclusi — in evidenza */}
        {servizi.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-600" /> Servizi inclusi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {servizi.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Servizio</div>
                  <div className="font-medium text-slate-800 mt-1">{s.nomeServizio || s.nome || s.descrizione || "-"}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">Importo</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{typeof s.importo === "number" ? formatEuro(s.importo) : "-"}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Totale manutenzione</span>
              <span className="ml-3 text-xl font-black text-slate-900">{formatEuro(totale)}</span>
            </div>
          </div>
        )}

        {/* Dati contratto + Riferimenti cliccabili */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Dati contratto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {c?.numero && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N° Contratto</div>
                <div className="text-lg font-black text-slate-900 mt-1">{c.numero}</div>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stato</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{c?.statoContratto || "-"}</div>
            </div>
            {c?.dataContratto && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data contratto</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{new Date(c.dataContratto).toLocaleDateString("it-IT")}</div>
              </div>
            )}
            {c?.scadenzaContratto && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scadenza</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{new Date(c.scadenzaContratto).toLocaleDateString("it-IT")}</div>
              </div>
            )}
            {c?.durataAnni != null && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durata (anni)</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{c.durataAnni}</div>
              </div>
            )}
            {c?.numeroVisiteAnnue != null && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visite annue</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{c.numeroVisiteAnnue}</div>
              </div>
            )}
            {c?.periodicitaFatturazione && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Periodicità fatturazione</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{c.periodicitaFatturazione}</div>
              </div>
            )}
            {c?.dataInizioFatturazione && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data inizio fatturazione</div>
                <div className="text-base font-semibold text-slate-900 mt-1">{new Date(c.dataInizioFatturazione).toLocaleDateString("it-IT")}</div>
              </div>
            )}
            {servizi.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Totale manutenzione</div>
                <div className="text-lg font-black text-slate-900 mt-1">{totale > 0 ? formatEuro(totale) : "-"}</div>
              </div>
            )}
          </div>

          {/* Riferimenti — chiaramente cliccabili */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Riferimenti — clicca per aprire il dettaglio</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {c?.impianto && (
                <button
                  type="button"
                  onClick={() => setDialog({ type: "impianto", id: c.impianto.id })}
                  className="rounded-xl border-2 border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-start gap-3 group"
                >
                  <div className="rounded-lg bg-slate-100 p-2 group-hover:bg-blue-100">
                    <Building2 className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
                    <div className="font-semibold text-slate-900 mt-1 truncate">{c.impianto.numeroImpianto || "-"} — {c.impianto.indirizzo}</div>
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">Apri dettaglio <ExternalLink className="h-3 w-3" /></div>
                  </div>
                </button>
              )}
              {c?.impianto?.cliente && (
                <button
                  type="button"
                  onClick={() => setDialog({ type: "cliente", id: c.impianto.cliente.id })}
                  className="rounded-xl border-2 border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-start gap-3 group"
                >
                  <div className="rounded-lg bg-slate-100 p-2 group-hover:bg-blue-100">
                    <User className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</div>
                    <div className="font-semibold text-slate-900 mt-1 truncate">{c.impianto.cliente.denominazione}</div>
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">Apri dettaglio <ExternalLink className="h-3 w-3" /></div>
                  </div>
                </button>
              )}
              {c?.impianto?.amministratore && (
                <button
                  type="button"
                  onClick={() => setDialog({ type: "amministratore", id: c.impianto.amministratore.id })}
                  className="rounded-xl border-2 border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-start gap-3 group"
                >
                  <div className="rounded-lg bg-slate-100 p-2 group-hover:bg-blue-100">
                    <Briefcase className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amministratore</div>
                    <div className="font-semibold text-slate-900 mt-1 truncate">{c.impianto.amministratore.denominazione}</div>
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">Apri dettaglio <ExternalLink className="h-3 w-3" /></div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog dettaglio Impianto / Cliente / Amministratore */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          {dialog?.type === "impianto" ? (
            renderDialogContent()
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">{dialogTitle}</h3>
              {renderDialogContent()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica — stesso aspetto della lista contratti */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[24px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="!text-2xl !font-black uppercase tracking-tight text-slate-900">
              MODIFICA CONTRATTO
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
            <ContrattoForm
              defaultValues={c}
              impianti={availableImpianti}
              onSuccess={() => {
                setEditOpen(false);
                router.refresh();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

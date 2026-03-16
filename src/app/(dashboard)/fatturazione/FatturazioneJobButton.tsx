"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { generaFattureAutomatichePerMese } from "../fatture/actions";

export function FatturazioneJobButton() {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<{
    created: number;
    skipped: number;
    alreadyExisting: number;
    skippedDetails: {
      id: string;
      numero: string | null;
      impianto: string | null;
      cliente: string | null;
      motivo: string;
    }[];
  } | null>(null);

  const handleClick = () => {
    startTransition(async () => {
      const res = await generaFattureAutomatichePerMese();
      if (!res?.success) {
        alert(res?.error || "Errore durante la generazione delle fatture.");
        return;
      }
      const created = res.created?.length ?? 0;
      const skipped = res.skipped?.length ?? 0;
      const alreadyExisting = res.alreadyExisting?.length ?? 0;
      const skippedDetails = res.skippedDetails ?? [];
      setLastResult({ created, skipped, alreadyExisting, skippedDetails });
      alert(
        `Fatture generate: ${created}.\nContratti senza righe fatturabili: ${skipped}.\nContratti con fattura già esistente per il periodo: ${alreadyExisting}.`
      );
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full sm:w-auto uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-md"
      >
        <RefreshCcw
          className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Generazione in corso..." : "Genera fatture questo mese"}
      </Button>
      {lastResult && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Ultima esecuzione: create {lastResult.created}, già esistenti{" "}
            {lastResult.alreadyExisting}, senza righe fatturabili{" "}
            {lastResult.skipped}.
          </p>
          {lastResult.skippedDetails.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-700">
                Contratti non fatturati per questo mese
              </p>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[11px] text-slate-500">
                      <th className="py-1 pr-2 text-left">N. Contratto</th>
                      <th className="py-1 px-2 text-left">Impianto</th>
                      <th className="py-1 px-2 text-left">Cliente</th>
                      <th className="py-1 pl-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.skippedDetails.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-1 pr-2 font-medium">
                          {c.numero || "—"}
                        </td>
                        <td className="py-1 px-2">
                          {c.impianto || "—"}
                        </td>
                        <td className="py-1 px-2">
                          {c.cliente || "—"}
                        </td>
                        <td className="py-1 pl-2">
                          {c.motivo === "DATI_INCOMPLETI"
                            ? "Dati incompleti (impianto/cliente/mancano date)"
                            : c.motivo === "API_ERROR"
                            ? "Errore creazione fattura su Fatture in Cloud"
                            : "Nessun servizio con importo > 0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


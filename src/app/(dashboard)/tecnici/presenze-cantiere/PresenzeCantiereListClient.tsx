"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { ArrowLeft, HardHat, Upload, PlusCircle } from "lucide-react";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  PresenzaCantiereWithRelations,
  ImportPresenzeCantiereResult,
} from "./actions";
import { importPresenzeCantiereFromCsv } from "./actions";

type Props = {
  presenze: PresenzaCantiereWithRelations[];
  currentUser: { id: string; name: string; role: string };
  permissions?: { Booking?: { READ?: boolean }; PresenzeCantiere?: { CREATE?: boolean } };
  /** Link "Indietro" (default: /tecnici) */
  backHref?: string;
  /** Mostra sezione Importa CSV (solo da dashboard Booking, non per tecnici) */
  showImport?: boolean;
  /** Base path per link al dettaglio (es. /tecnici/presenze-cantiere o /booking/presenze-cantiere) */
  basePath?: string;
};

export function PresenzeCantiereListClient({
  presenze,
  currentUser,
  permissions,
  backHref = "/tecnici",
  showImport = false,
  basePath,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportPresenzeCantiereResult | null>(null);
  const [selectedPresenza, setSelectedPresenza] = useState<PresenzaCantiereWithRelations | null>(null);

  const canImport = showImport && !!(permissions?.Booking?.READ || permissions?.PresenzeCantiere?.CREATE);
  const showBookingLinkInDetail = basePath?.includes("booking") ?? false;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !canImport) return;
    setImportResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importPresenzeCantiereFromCsv(text);
      setImportResult(result);
      router.refresh();
    } catch (err) {
      setImportResult({
        created: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Errore import"],
      });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full min-h-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="h-5 w-5" /> Indietro
        </Link>
        {basePath && (
          <Link href={`${basePath}/nuova`}>
            <Button className="gap-2 font-semibold">
              <PlusCircle className="h-4 w-4" /> Nuova presenza cantiere
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 rounded-xl">
            <HardHat className="h-8 w-8 text-amber-700" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
              Presenze cantiere
            </h1>
            <p className="text-slate-500 font-medium">
              {basePath
                ? "Elenco in sola lettura. Usa il pulsante sopra per aggiungere una nuova presenza."
                : "Elenco in sola lettura. Per aggiungere usa la card \"Nuova presenza cantiere\" dalla dashboard."}
            </p>
          </div>
        </div>

        {canImport && (
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 mb-2 uppercase tracking-wider">
              Importa CSV
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              File con colonne: DATA, Tecnico, ORE CANTIERE, DESCRIZIONE, IMPIANTO (IMPIANTO = codice impianto Booking, Tecnico = nome utente).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={importing}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Import in corso..." : "Scegli file CSV"}
            </Button>
            {importResult && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-green-700">
                  Importate: {importResult.created} · Saltate: {importResult.skipped}
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 text-amber-700 list-disc list-inside max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 20).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {importResult.errors.length > 20 && (
                      <li>... altre {importResult.errors.length - 20} righe con errori</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {presenze.length === 0 ? (
          <p className="text-slate-500 font-medium">Nessuna presenza cantiere registrata.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {presenze.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPresenza(p)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedPresenza(p)}
                  className="grid-table-mobile-card cursor-pointer"
                >
                  <div className="grid-table-mobile-card__label">Data</div>
                  <div className="grid-table-mobile-card__value">
                    {new Date(p.data).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <div className="grid-table-mobile-card__label">Tecnico</div>
                  <div className="grid-table-mobile-card__value">{p.tecnico?.name ?? "-"}</div>
                  <div className="grid-table-mobile-card__label">Ore · Impianto</div>
                  <div className="grid-table-mobile-card__value">
                    {p.oreCantiere} · {p.booking?.codiceImpianto ?? "-"}
                  </div>
                  <div className="grid-table-mobile-card__label">Descrizione</div>
                  <div className="grid-table-mobile-card__value truncate" title={p.descrizione ?? ""}>
                    {p.descrizione ?? "-"}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block w-full rounded-xl border border-slate-200 overflow-hidden">
              <VirtualizedTable
                items={presenze}
                rowHeight={48}
                gridTemplateColumns="0.9fr 1fr 0.7fr 1fr 1.5fr"
                maxHeight="60vh"
                header={
                  <>
                    <TableTh>Data</TableTh>
                    <TableTh>Tecnico</TableTh>
                    <TableTh>Ore cantiere</TableTh>
                    <TableTh>Impianto</TableTh>
                    <TableTh>Descrizione</TableTh>
                  </>
                }
              >
                {(p) => (
                  <>
                    <TableTd
                      className="font-medium cursor-pointer truncate"
                      onClick={() => setSelectedPresenza(p)}
                      title={new Date(p.data).toLocaleDateString("it-IT")}
                    >
                      {new Date(p.data).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableTd>
                    <TableTd className="cursor-pointer truncate" onClick={() => setSelectedPresenza(p)} title={p.tecnico?.name ?? ""}>
                      {p.tecnico?.name ?? "-"}
                    </TableTd>
                    <TableTd className="cursor-pointer" onClick={() => setSelectedPresenza(p)}>
                      {p.oreCantiere}
                    </TableTd>
                    <TableTd className="cursor-pointer truncate" onClick={() => setSelectedPresenza(p)} title={p.booking?.codiceImpianto ?? ""}>
                      {p.booking?.codiceImpianto ?? "-"}
                    </TableTd>
                    <TableTd className="cursor-pointer truncate" onClick={() => setSelectedPresenza(p)} title={p.descrizione ?? ""}>
                      {p.descrizione ?? "-"}
                    </TableTd>
                  </>
                )}
              </VirtualizedTable>
            </div>
          </>
        )}

        <Dialog open={!!selectedPresenza} onOpenChange={(open) => !open && setSelectedPresenza(null)}>
          <DialogContent
            className="max-w-lg rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden shadow-xl"
            showCloseButton={true}
          >
            {selectedPresenza && (
              <>
                <DialogHeader className="border-b border-slate-100 bg-amber-50/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                      <HardHat className="h-5 w-5 text-amber-700" strokeWidth={2} />
                    </div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                      Dettaglio presenza cantiere
                    </DialogTitle>
                  </div>
                </DialogHeader>
                <div className="px-6 py-5">
                  <dl className="grid gap-4">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</dt>
                      <dd className="mt-0.5 text-slate-900 font-medium">
                        {new Date(selectedPresenza.data).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Tecnico</dt>
                      <dd className="mt-0.5 text-slate-900 font-medium">{selectedPresenza.tecnico?.name ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Ore cantiere</dt>
                      <dd className="mt-0.5 text-slate-900 font-medium">{selectedPresenza.oreCantiere}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Cantiere / Impianto</dt>
                      <dd className="mt-0.5 text-slate-900 font-medium">
                        {selectedPresenza.booking
                          ? [selectedPresenza.booking.codiceImpianto, selectedPresenza.booking.indirizzoImpianto, selectedPresenza.booking.comuneImpianto]
                              .filter(Boolean)
                              .join(" | ") || "-"
                          : "-"}
                      </dd>
                      {showBookingLinkInDetail && selectedPresenza.booking?.id && (
                        <dd className="mt-1">
                          <Link
                            href={`/booking/${selectedPresenza.booking.id}`}
                            className="text-sm text-primary font-semibold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Vai al booking →
                          </Link>
                        </dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Descrizione</dt>
                      <dd className="mt-0.5 text-slate-900 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedPresenza.descrizione ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

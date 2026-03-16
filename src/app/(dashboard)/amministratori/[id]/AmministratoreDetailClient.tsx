"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { ChiudiButton } from "@/components/ChiudiButton";
import {
  DataGridScroll,
  DataGridHead,
  DataGridBody,
  DataGridEmpty,
  GridRow,
  GridCell,
  ColumnHeader,
  TipologiaBadge,
} from "@/components/datagrid";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getImpiantoDetail } from "@/app/(dashboard)/impianti/actions";
import { getFatturaById } from "@/app/(dashboard)/fatture/actions";
import { FatturaDetailView } from "@/app/(dashboard)/fatture/components/FatturaDetailView";
import { ImpiantoDetailDialogContent } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialogContent";
import { EstrattoContoButton } from "../components/EstrattoContoButton";
import { formatEuro } from "@/lib/money";

function renderStatoFatturaBadge(stato?: string | null) {
  if (stato === "STORNATO") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
        Stornato
      </span>
    );
  }
  if (stato === "PARZ. STORNATO") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        Parz. Stornato
      </span>
    );
  }
  if (stato === "SALDATO") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
        Saldato
      </span>
    );
  }
  if (stato === "PARZIALE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
        Parziale
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
      Da Saldare
    </span>
  );
}

function AmministratoreDetailClientInner({
  amministratore,
  impianti,
  fatture,
  returnTo,
  permissionsFatture,
}: {
  amministratore: any;
  impianti: any[];
  fatture: any[];
  returnTo: string | null;
  permissionsFatture: any;
}) {
  const [selectedImpiantoId, setSelectedImpiantoId] = useState<string | null>(null);
  const [selectedFatturaId, setSelectedFatturaId] = useState<string | null>(null);
  const [impiantoDetail, setImpiantoDetail] = useState<any | null>(null);
  const [fatturaData, setFatturaData] = useState<any | null>(null);
  const [loadingImpianto, setLoadingImpianto] = useState(false);
  const [loadingFattura, setLoadingFattura] = useState(false);

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

  useEffect(() => {
    if (!selectedFatturaId) {
      setFatturaData(null);
      return;
    }
    let cancelled = false;
    setLoadingFattura(true);
    getFatturaById(selectedFatturaId).then((res) => {
      if (cancelled) return;
      setLoadingFattura(false);
      if (res?.success && (res as any).data) setFatturaData((res as any).data);
      else setFatturaData(null);
    });
    return () => { cancelled = true; };
  }, [selectedFatturaId]);

  return (
    <>
      <div className="flex flex-col gap-6 w-full p-2">
        <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Dettaglio Amministratore
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {amministratore?.denominazione || ""}
            </p>
          </div>
          <div className="flex flex-row items-center gap-3 shrink-0">
            {amministratore?.id && (
              <EstrattoContoButton amministratoreId={amministratore.id} />
            )}
            <ChiudiButton
              listPath="/amministratori"
              className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Denominazione
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {amministratore?.denominazione || ""}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Indirizzo
              </div>
              <div className="text-base font-semibold text-slate-900 mt-1 whitespace-normal break-words">
                {amministratore?.indirizzo || ""}
                {(amministratore?.cap || amministratore?.comune || amministratore?.provincia) ? (
                  <div className="text-sm text-slate-500 font-medium mt-1">
                    {amministratore?.cap ? `${amministratore.cap} ` : ""}
                    {amministratore?.comune || ""}
                    {amministratore?.provincia ? ` (${amministratore.provincia})` : ""}
                  </div>
                ) : null}
              </div>
            </div>
            {amministratore?.email ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1">
                  {amministratore.email}
                </div>
              </div>
            ) : null}
            {amministratore?.pec ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  PEC
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1">
                  {amministratore.pec}
                </div>
              </div>
            ) : null}
            {amministratore?.telefono ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Telefono
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1">
                  {amministratore.telefono}
                </div>
              </div>
            ) : null}
            {amministratore?.cellulare ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cellulare
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1">
                  {amministratore.cellulare}
                </div>
              </div>
            ) : null}
            {amministratore?.codiceSdi ? (
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Codice SDI
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1">
                  {amministratore.codiceSdi}
                </div>
              </div>
            ) : null}
            {amministratore?.note ? (
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Note
                </div>
                <div className="text-base font-semibold text-slate-900 mt-1 whitespace-normal break-words">
                  {amministratore.note}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tabelle relazionali: 2 colonne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:bg-white md:border border-slate-200 rounded-2xl md:shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="font-black text-slate-900 uppercase tracking-wider text-sm">
              Impianti collegati ({impianti.length})
            </div>
          </div>
          <div className="overflow-x-auto">
            <DataGridScroll maxHeight="none">
              <DataGridHead style={{ gridTemplateColumns: "140px 1fr 1fr 140px" }}>
                <ColumnHeader>N° Impianto</ColumnHeader>
                <ColumnHeader>Indirizzo</ColumnHeader>
                <ColumnHeader>Cliente</ColumnHeader>
                <ColumnHeader>Tipologia</ColumnHeader>
              </DataGridHead>
              <DataGridBody>
                {impianti.length === 0 ? (
                  <DataGridEmpty>Nessun impianto collegato.</DataGridEmpty>
                ) : (
                  impianti.map((imp: any) => (
                    <GridRow
                      key={imp.id}
                      clickable
                      style={{ gridTemplateColumns: "140px 1fr 1fr 140px" }}
                      onClick={() => setSelectedImpiantoId(imp.id)}
                    >
                      <GridCell>{imp.numeroImpianto || "—"}</GridCell>
                      <GridCell>
                        <div className="whitespace-normal break-words">
                          {imp.indirizzo || "—"}
                          <div className="text-xs text-slate-500 font-semibold mt-1">
                            {(imp.cap || "—")} {imp.comune || "—"} ({imp.provincia || "—"})
                          </div>
                        </div>
                      </GridCell>
                      <GridCell truncate>{imp.cliente?.denominazione || "—"}</GridCell>
                      <GridCell><TipologiaBadge value={imp.tipologia} /></GridCell>
                    </GridRow>
                  ))
                )}
              </DataGridBody>
            </DataGridScroll>
          </div>
        </div>

        <div className="md:bg-white md:border border-slate-200 rounded-2xl md:shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="font-black text-slate-900 uppercase tracking-wider text-sm">
              Fatture collegate ({fatture.length})
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
              <div className="grid-table__head" style={{ gridTemplateColumns: "140px 140px 1fr 140px 140px 1fr" }} role="row">
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Numero</div>
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Data</div>
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Cliente</div>
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Importo</div>
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Stato</div>
                <div className="grid-table__head-cell py-4 font-bold text-slate-700">Oggetto</div>
              </div>
              <div className="grid-table__body">
                {fatture.length === 0 ? (
                  <div className="grid-table__row" style={{ gridTemplateColumns: "140px 140px 1fr 140px 140px 1fr" }} role="row">
                    <div className="grid-table__cell text-center text-slate-500 font-medium py-12" style={{ gridColumn: "1 / -1" }}>
                      Nessuna fattura collegata.
                    </div>
                  </div>
                ) : (
                  fatture.map((f: any) => (
                    <div
                      key={f.id}
                      className="grid-table__row cursor-pointer"
                      style={{ gridTemplateColumns: "140px 140px 1fr 140px 140px 1fr" }}
                      role="row"
                      onClick={() => setSelectedFatturaId(f.id)}
                    >
                      <div className="grid-table__cell py-4 font-black text-slate-900">{f.numero || "-"}</div>
                      <div className="grid-table__cell py-4 text-slate-700 font-medium">{f.data ? new Date(f.data).toLocaleDateString("it-IT") : "-"}</div>
                      <div className="grid-table__cell py-4 text-slate-900 font-medium whitespace-normal break-words">{f.cliente?.denominazione || f.clienteNome || "-"}</div>
                      <div className="grid-table__cell py-4 text-slate-900 font-bold">{typeof f.importoTotale === "number" ? formatEuro(f.importoTotale) : "-"}</div>
                      <div className="grid-table__cell py-4">{renderStatoFatturaBadge(f.stato)}</div>
                      <div className="grid-table__cell py-4 text-slate-700 font-medium whitespace-normal break-words">{f.oggetto || "-"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

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

      <Dialog open={!!selectedFatturaId} onOpenChange={(open) => !open && setSelectedFatturaId(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedFatturaId && (
            loadingFattura ? (
              <div className="p-8 text-slate-500">Caricamento...</div>
            ) : fatturaData ? (
              <FatturaDetailView
                fattura={fatturaData}
                permissions={permissionsFatture || {}}
                onClose={() => setSelectedFatturaId(null)}
                isStandalone={false}
              />
            ) : (
              <div className="p-8 text-slate-500">Fattura non trovata.</div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AmministratoreDetailClient = memo(AmministratoreDetailClientInner);
AmministratoreDetailClient.displayName = "AmministratoreDetailClient";

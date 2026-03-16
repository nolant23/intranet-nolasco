"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInterventoById } from "../actions";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";

export function InterventiArchivioClient({
  interventi,
  total,
  pageSize,
  currentPage,
}: {
  interventi: any[];
  total: number;
  pageSize: number;
  currentPage: number;
}) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleOpenDetail = (intervento: any) => {
    setDetailId(intervento.id);
    setDetailData(null);
  };

  useEffect(() => {
    if (!detailId) {
      setDetailData(null);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    getInterventoById(detailId).then((res) => {
      if (cancelled) return;
      setLoadingDetail(false);
      if (res?.success && (res as any).data) setDetailData((res as any).data);
      else setDetailData(null);
    });
    return () => { cancelled = true; };
  }, [detailId]);

  const goToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    const url = pageNum === 1 ? "/interventi/archivio" : `/interventi/archivio?page=${pageNum}`;
    router.push(url);
  };

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Archivio Interventi
          </h1>
          <p className="text-slate-500 font-medium mt-1">Interventi degli anni passati</p>
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="overflow-x-auto pr-2 md:pr-4">
          {interventi.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">
              Nessun intervento in archivio.
            </div>
          ) : (
            <div className="hidden md:block">
              <VirtualizedTable
                items={interventi}
                rowHeight={48}
                gridTemplateColumns="0.75fr 2fr 1.2fr 1.5fr"
                maxHeight="60vh"
                header={
                  <>
                    <TableTh>Data</TableTh>
                    <TableTh>Impianto</TableTh>
                    <TableTh>Tecnico</TableTh>
                    <TableTh>N° Rapportino</TableTh>
                  </>
                }
              >
                {(i) => {
                  const addr = [i.impianto?.indirizzo, i.impianto?.comune].filter(Boolean).join(", ");
                  const impiantoLine = [i.impianto?.numeroImpianto, addr].filter(Boolean).join(" · ");
                  return (
                    <>
                      <TableTd className="nowrap cursor-pointer" onClick={() => handleOpenDetail(i)}>
                        {i.dataIntervento ? new Date(i.dataIntervento).toLocaleDateString("it-IT") : "-"}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer font-medium" onClick={() => handleOpenDetail(i)}>
                        {impiantoLine || "-"}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(i)}>
                        {i.tecnico?.name || "-"}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(i)}>
                        {i.numeroRapportino || "-"}
                      </TableTd>
                    </>
                  );
                }}
              </VirtualizedTable>
            </div>
          )}
        </div>
        {interventi.length > 0 && (
          <>
            <div className="md:hidden space-y-3 p-4">
              {interventi.map((i) => (
                <div
                  key={i.id}
                  onClick={() => handleOpenDetail(i)}
                  className="rounded-xl border border-slate-200 p-4 bg-white"
                >
                  <p className="text-xs text-slate-500">
                    {i.dataIntervento ? new Date(i.dataIntervento).toLocaleDateString("it-IT") : "-"}
                  </p>
                  <p className="font-semibold text-slate-900">N. {i.impianto?.numeroImpianto ?? "-"}</p>
                  <p className="text-sm text-slate-600">{i.tecnico?.name} · {i.numeroRapportino || "-"}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl">
              <div className="text-xs sm:text-sm text-slate-600">
                Pagina <span className="font-semibold">{currentPage}</span> di{" "}
                <span className="font-semibold">{totalPages}</span> — {total} interventi in archivio
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                  Precedente
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
                  Successiva
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
          {loadingDetail ? (
            <div className="p-8 text-slate-500">Caricamento...</div>
          ) : detailData ? (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Dettaglio Intervento</h2>
                <div className="flex gap-2">
                  {detailData.rapportinoPdf && (
                    <a href={detailData.rapportinoPdf} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
                      <FileDown className="h-4 w-4" /> Scarica rapportino
                    </a>
                  )}
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDetailId(null)}>Chiudi</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailData.numeroRapportino && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N° Rapportino</div>
                    <div className="text-lg font-black text-slate-900 mt-1">{detailData.numeroRapportino}</div>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.dataIntervento ? new Date(detailData.dataIntervento).toLocaleDateString("it-IT") : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">{detailData.tecnico?.name || "-"}</div>
                </div>
                {detailData.impianto && (
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
                    <ImpiantoDetailDialog impiantoId={detailData.impianto.id} className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block">
                      {detailData.impianto.numeroImpianto || ""} — {detailData.impianto.indirizzo}, {detailData.impianto.comune}
                    </ImpiantoDetailDialog>
                  </div>
                )}
                {(detailData.descrizioneIntervento || detailData.descrizione) && (
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrizione</div>
                    <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.descrizioneIntervento || detailData.descrizione}</div>
                  </div>
                )}
                {detailData.clienteFirmatario && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
                    <div className="text-base font-semibold text-slate-900 mt-1">{detailData.clienteFirmatario}</div>
                  </div>
                )}
              </div>
            </div>
          ) : detailId ? (
            <div className="p-8 text-slate-500">Intervento non trovato.</div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

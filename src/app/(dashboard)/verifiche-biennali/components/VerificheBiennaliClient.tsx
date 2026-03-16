"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClipboardCheck, ExternalLink, Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getVerificheBiennaliPaginated, getVerificaBiennaleById, deleteVerificaBiennale } from "../actions";
import {
  DataGrid,
  DataGridScroll,
  DataGridHead,
  DataGridBody,
  DataGridEmpty,
  GridRow,
  GridCell,
  ColumnHeader,
} from "@/components/datagrid";

const VERIFICHE_GRID_COLUMNS = "0.8fr 0.9fr 1fr 1.2fr 0.9fr 1.2fr";
import { TableSearch } from "@/components/table/TableSearch";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";
import { VerificaBiennaleForm } from "./VerificaBiennaleForm";

export function VerificheBiennaliClient({
  initialVerifiche,
  initialTotal,
  pageSize,
  impianti = [],
  tecnici = [],
  currentUser = null,
  permissions = null,
  initialFormOpen = false,
}: {
  initialVerifiche: any[];
  initialTotal: number;
  pageSize: number;
  impianti?: any[];
  tecnici?: any[];
  currentUser?: any;
  permissions?: any;
  initialFormOpen?: boolean;
}) {
  const [verifiche, setVerifiche] = useState<any[]>(initialVerifiche);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(initialFormOpen);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDefaultValues, setEditDefaultValues] = useState<any>(null);
  const canCreate = permissions?.CREATE;
  const canUpdate = permissions?.UPDATE;
  const canDelete = permissions?.DELETE;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingPage(true);
    getVerificheBiennaliPaginated(page, pageSize, search.trim() || null).then(({ data, total }) => {
      if (!cancelled) {
        setVerifiche(data);
        setTotalCount(total);
      }
      setIsLoadingPage(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

  const handleOpenDetail = (v: any) => {
    setDetailId(v.id);
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
    getVerificaBiennaleById(detailId).then((res) => {
      if (cancelled) return;
      setLoadingDetail(false);
      if (res?.success && (res as any).data) setDetailData((res as any).data);
    });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <ClipboardCheck className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">
                Verifiche biennali
              </h1>
              <p className="text-slate-500 font-medium mt-0.5">
                Elenco verifiche periodiche impianti
              </p>
            </div>
          </div>
          {canCreate && (
            <Button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="w-full sm:w-auto uppercase tracking-wider bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" /> Nuova verifica
            </Button>
          )}
        </div>
      </div>

      <DataGrid className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="max-w-md">
            <TableSearch
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Cerca impianto, tecnico, cliente, ente..."
            />
          </div>
        </div>

        <div className="min-h-[200px]">
          {verifiche.length === 0 && !isLoadingPage ? (
            <DataGridEmpty>Nessuna verifica biennale registrata.</DataGridEmpty>
          ) : isLoadingPage ? (
            <div className="datagrid__empty">Caricamento...</div>
          ) : (
            <>
              <div className="md:hidden space-y-3 p-4">
                {verifiche.map((v) => (
                  <div
                    key={v.id}
                    className="datagrid-mobile-card cursor-pointer"
                    onClick={() => handleOpenDetail(v)}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="datagrid-mobile-card__label">
                      {v.dataVerifica ? new Date(v.dataVerifica).toLocaleDateString("it-IT") : "—"}
                    </p>
                    <p className="datagrid-mobile-card__value font-semibold">
                      N. {v.impianto?.numeroImpianto ?? "—"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {v.impianto?.indirizzo}, {v.impianto?.comune}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {v.tecnico?.name ?? "—"} · {v.clienteFirmatario ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block w-full min-w-0">
                <DataGridScroll maxHeight="60vh">
                  <DataGridHead style={{ gridTemplateColumns: VERIFICHE_GRID_COLUMNS }}>
                    <ColumnHeader>Data</ColumnHeader>
                    <ColumnHeader>Impianto</ColumnHeader>
                    <ColumnHeader>Tecnico</ColumnHeader>
                    <ColumnHeader>Cliente firmatario</ColumnHeader>
                    <ColumnHeader>Ente</ColumnHeader>
                    <ColumnHeader>Prescrizioni</ColumnHeader>
                  </DataGridHead>
                  <DataGridBody>
                    {verifiche.map((v) => (
                      <GridRow
                        key={v.id}
                        clickable
                        style={{ gridTemplateColumns: VERIFICHE_GRID_COLUMNS }}
                        onClick={() => handleOpenDetail(v)}
                      >
                        <GridCell>
                          {v.dataVerifica ? new Date(v.dataVerifica).toLocaleDateString("it-IT") : "—"}
                        </GridCell>
                        <GridCell truncate>{v.impianto?.numeroImpianto ?? "—"}</GridCell>
                        <GridCell truncate>{v.tecnico?.name ?? "—"}</GridCell>
                        <GridCell truncate>{v.clienteFirmatario ?? "—"}</GridCell>
                        <GridCell truncate>{v.enteNotificato ?? "—"}</GridCell>
                        <GridCell truncate title={v.prescrizioni ?? ""}>
                          {v.prescrizioni ? (v.prescrizioni.length > 50 ? `${v.prescrizioni.slice(0, 50)}…` : v.prescrizioni) : "—"}
                        </GridCell>
                      </GridRow>
                    ))}
                  </DataGridBody>
                </DataGridScroll>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div className="text-xs sm:text-sm text-slate-600">
            Pagina <span className="font-semibold">{page}</span> di{" "}
            <span className="font-semibold">{totalPages}</span> — {totalCount} verifiche
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoadingPage}
              onClick={() => {
                if (page <= 1) return;
                setPage((p) => p - 1);
              }}
            >
              Precedente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoadingPage}
              onClick={() => {
                if (page >= totalPages) return;
                setPage((p) => p + 1);
              }}
            >
              Successiva
            </Button>
          </div>
        </div>
      </DataGrid>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent
          className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          {loadingDetail ? (
            <div className="p-8 text-slate-500">Caricamento...</div>
          ) : detailData ? (
            <div className="flex flex-col max-h-[90vh]">
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  Dettaglio verifica biennale
                </h2>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setDetailId(null)}
                >
                  Chiudi
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Data verifica
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.dataVerifica
                      ? new Date(detailData.dataVerifica).toLocaleDateString("it-IT")
                      : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tecnico
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.tecnico?.name ?? "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ente notificato
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.enteNotificato ?? "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ingegnere
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.ingegnere ?? "-"}
                  </div>
                </div>
                {detailData.impianto && (
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Impianto
                    </div>
                    <ImpiantoDetailDialog
                      impiantoId={detailData.impianto.id}
                      className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block"
                    >
                      {detailData.impianto.numeroImpianto ?? ""} — {detailData.impianto.indirizzo},{" "}
                      {detailData.impianto.comune}
                    </ImpiantoDetailDialog>
                  </div>
                )}
                {(detailData.firmaCliente || detailData.clienteFirmatario) && (
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2 flex flex-col sm:flex-row flex-wrap items-start gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Firma cliente
                      </div>
                      {detailData.firmaCliente ? (
                        detailData.firmaCliente.startsWith("data:") ? (
                          <img
                            src={detailData.firmaCliente}
                            alt="Firma cliente"
                            className="max-h-32 max-w-full object-contain rounded border border-slate-200"
                          />
                        ) : (
                          <a
                            href={detailData.firmaCliente}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4" /> Apri firma
                          </a>
                        )
                      ) : null}
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                        Cliente firmatario
                      </div>
                      <div className="text-base font-semibold text-slate-900">
                        {detailData.clienteFirmatario ?? "-"}
                      </div>
                    </div>
                  </div>
                )}
                {detailData.prescrizioni && (
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Prescrizioni
                    </div>
                    <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">
                      {detailData.prescrizioni}
                    </div>
                  </div>
                )}
              </div>
              </div>

              <div className="shrink-0 bg-slate-100 border-t border-slate-200 px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                {detailData.verbaleUrl ? (
                  <a
                    href={detailData.verbaleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4" /> Apri verbale
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-200/50 px-4 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed w-full sm:w-auto">
                    <FileText className="h-4 w-4" /> Apri verbale
                  </span>
                )}
                {canUpdate && (
                  <Button
                    type="button"
                    variant="default"
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full sm:w-auto"
                    onClick={() => {
                      setEditDefaultValues(detailData);
                      setIsEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Modifica
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm w-full sm:w-auto"
                    onClick={async () => {
                      if (!detailId || !confirm("Eliminare questa verifica biennale?")) return;
                      const res = await deleteVerificaBiennale(detailId);
                      if (res.success) {
                        setDetailId(null);
                        setDetailData(null);
                        getVerificheBiennaliPaginated(page, pageSize, search.trim() || null).then(({ data, total }) => {
                          setVerifiche(data);
                          setTotalCount(total);
                        });
                      } else {
                        alert(res.error || "Errore durante l'eliminazione");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Elimina
                  </Button>
                )}
              </div>
            </div>
          ) : detailId ? (
            <div className="p-8 text-slate-500">Verifica non trovata.</div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Nuova verifica biennale
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
            <VerificaBiennaleForm
              impianti={impianti}
              tecnici={tecnici}
              currentUser={currentUser}
              onSuccess={() => {
                setIsFormOpen(false);
                window.location.reload();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => !open && (setIsEditOpen(false), setEditDefaultValues(null))}>
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Modifica verifica biennale
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
            {editDefaultValues && (
              <VerificaBiennaleForm
                defaultValues={editDefaultValues}
                verificaId={editDefaultValues.id}
                impianti={impianti}
                tecnici={tecnici}
                currentUser={currentUser}
                onSuccess={() => {
                  setIsEditOpen(false);
                  setEditDefaultValues(null);
                  setDetailId(null);
                  setDetailData(null);
                  getVerificheBiennaliPaginated(page, pageSize, search.trim() || null).then(({ data, total }) => {
                    setVerifiche(data);
                    setTotalCount(total);
                  });
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

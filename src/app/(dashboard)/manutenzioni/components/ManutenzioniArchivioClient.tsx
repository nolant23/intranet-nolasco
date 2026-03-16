"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteManutenzione } from "../actions";
import { TableSearch } from "@/components/table/TableSearch";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";

export function ManutenzioniArchivioClient({
  manutenzioni,
  total,
  pageSize,
  currentPage,
  anni,
  comuni,
  selectedAnno,
  selectedComune,
  permissions,
}: {
  manutenzioni: any[];
  total: number;
  pageSize: number;
  currentPage: number;
  anni: number[];
  comuni: string[];
  selectedAnno: number | undefined;
  selectedComune: string;
  permissions: any;
}) {
  const router = useRouter();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const canDelete = permissions?.DELETE;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filteredManutenzioni = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return manutenzioni;
    return manutenzioni.filter((m: any) =>
      [
        m.impianto?.numeroImpianto,
        m.impianto?.indirizzo,
        m.impianto?.comune,
        m.tecnico?.name,
        m.clienteFirmatario,
        m.note,
      ]
        .filter(Boolean)
        .some((field: any) => String(field).toLowerCase().includes(q))
    );
  }, [manutenzioni, search]);

  const buildArchivioUrl = (page: number) => {
    const params = new URLSearchParams();
    if (selectedAnno != null) params.set("anno", String(selectedAnno));
    if (selectedComune && selectedComune.trim() !== "") params.set("comune", selectedComune.trim());
    if (page > 1) params.set("page", String(page));
    const q = params.toString();
    return `/manutenzioni/archivio${q ? `?${q}` : ""}`;
  };

  const handleOpenDetail = (m: any) => {
    setDetailData(m);
    setIsDetailOpen(true);
  };

  const handleFilterChange = (anno: string, comune: string) => {
    const params = new URLSearchParams();
    if (anno && anno !== "tutti") params.set("anno", anno);
    if (comune && comune.trim() !== "") params.set("comune", comune.trim());
    router.push(`/manutenzioni/archivio${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const goToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    router.push(buildArchivioUrl(pageNum));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa manutenzione?")) {
      const res = await deleteManutenzione(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || "Errore durante l'eliminazione");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Archivio Manutenzioni
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manutenzioni degli anni passati
          </p>
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4 px-4 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Anno</span>
              <Select
                value={selectedAnno != null ? String(selectedAnno) : "tutti"}
                onValueChange={(v) => handleFilterChange(v ?? "tutti", selectedComune ?? "")}
              >
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue placeholder="Tutti gli anni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli anni</SelectItem>
                  {anni.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Comune</span>
              <Select
                value={selectedComune && selectedComune.trim() !== "" ? selectedComune : "tutti"}
                onValueChange={(v) =>
                  handleFilterChange(
                    selectedAnno != null ? String(selectedAnno) : "tutti",
                    v === "tutti" || v == null ? "" : v
                  )
                }
              >
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="Tutti i comuni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i comuni</SelectItem>
                  {comuni.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-start pb-4">
            <TableSearch
              value={search}
              onChange={(v) => setSearch(v)}
              placeholder="Cerca per impianto, tecnico, cliente..."
            />
          </div>
        </div>

        <div className="overflow-x-auto pr-2 md:pr-4">
          {filteredManutenzioni.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">Nessuna manutenzione in archivio per i filtri selezionati.</div>
          ) : (
            <>
            <div className="md:hidden space-y-3">
              {filteredManutenzioni.map((m) => {
                const addr = [m.impianto?.indirizzo, (m.impianto?.cap || ""), m.impianto?.comune, m.impianto?.provincia ? `(${m.impianto.provincia})` : ""].filter(Boolean).join(" ");
                return (
                  <div key={m.id} onClick={() => handleOpenDetail(m)} className="grid-table-mobile-card">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs text-slate-500">{new Date(m.dataManutenzione).toLocaleDateString("it-IT")}</p>
                        <p className="font-semibold text-slate-900">N. {m.impianto?.numeroImpianto}</p>
                        <p className="text-sm text-slate-700">{addr}</p>
                        <p className="text-sm text-slate-600 mt-1">{m.tecnico?.name} · {m.clienteFirmatario}</p>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {canDelete && <Button type="button" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
            <VirtualizedTable
              items={filteredManutenzioni}
              rowHeight={48}
              gridTemplateColumns="0.75fr 2fr 1.2fr 1.5fr 1fr 0.8fr"
              maxHeight="60vh"
              header={
                <>
                  <TableTh>Data</TableTh>
                  <TableTh>Impianto</TableTh>
                  <TableTh>Comune</TableTh>
                  <TableTh>Tecnico</TableTh>
                  <TableTh>Cliente</TableTh>
                  <TableTh>Azioni</TableTh>
                </>
              }
            >
              {(m) => {
                const addr = [m.impianto?.indirizzo, (m.impianto?.cap || ""), m.impianto?.comune, m.impianto?.provincia ? `(${m.impianto.provincia})` : ""].filter(Boolean).join(" ");
                const impiantoLine = `N. ${m.impianto?.numeroImpianto} · ${addr}`.trim();
                const impiantoTitle = [m.impianto?.indirizzo, `${(m.impianto?.cap || "")} ${m.impianto?.comune} (${m.impianto?.provincia || ""})`.trim()].filter(Boolean).join("\n");
                const comuneLine = `${m.impianto?.cap || "-"} ${m.impianto?.comune} (${m.impianto?.provincia || "-"})`.trim();
                return (
                  <>
                    <TableTd className="nowrap cursor-pointer" onClick={() => handleOpenDetail(m)}>{new Date(m.dataManutenzione).toLocaleDateString("it-IT")}</TableTd>
                    <TableTd className="truncate cursor-pointer font-medium" title={impiantoTitle} onClick={() => handleOpenDetail(m)}>{impiantoLine}</TableTd>
                    <TableTd className="truncate cursor-pointer text-slate-600" onClick={() => handleOpenDetail(m)}>{comuneLine}</TableTd>
                    <TableTd className="truncate cursor-pointer" title={m.tecnico?.name ?? ""} onClick={() => handleOpenDetail(m)}>{m.tecnico?.name}</TableTd>
                    <TableTd className="truncate cursor-pointer" title={m.clienteFirmatario} onClick={() => handleOpenDetail(m)}>{m.clienteFirmatario}</TableTd>
                    <TableTd className="actions" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {canDelete && <Button type="button" variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </TableTd>
                  </>
                );
              }}
            </VirtualizedTable>
            </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl">
        <div className="text-xs sm:text-sm text-slate-600">
          Pagina <span className="font-semibold">{currentPage}</span> di{" "}
          <span className="font-semibold">{totalPages}</span> —{" "}
          {total} manutenzioni in archivio
          {search.trim() ? ` (${filteredManutenzioni.length} in pagina)` : ""}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            Precedente
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Successiva
          </Button>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px]" showCloseButton={false}>
          <DialogHeader className="mb-2 flex flex-row items-center justify-between gap-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              DETTAGLIO MANUTENZIONE
            </DialogTitle>
            <div className="flex gap-2 shrink-0">
              {detailData?.rapportinoPdf && (
                <a href={detailData.rapportinoPdf} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}>
                  <FileDown className="h-4 w-4" /> Scarica rapportino
                </a>
              )}
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setIsDetailOpen(false)}>Chiudi</Button>
            </div>
          </DialogHeader>
          {detailData ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data / Ora</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {new Date(detailData.dataManutenzione).toLocaleDateString("it-IT")}
                    {detailData.oraEsecuzione ? ` — ${detailData.oraEsecuzione}` : ""}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.tecnico?.name || "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.impianto
                      ? `Impianto ${detailData.impianto.numeroImpianto || ""} — ${detailData.impianto.indirizzo}, ${detailData.impianto.comune}`
                      : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">
                    {detailData.clienteFirmatario || "-"}
                  </div>
                </div>
              </div>
              {detailData.effettuaSemestrale ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Controlli semestrali</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailData.efficienzaParacadute != null && (
                      <div>
                        <div className="text-xs text-slate-500">Efficienza paracadute</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.efficienzaParacadute ? "Sì" : "No"}</div>
                      </div>
                    )}
                    {detailData.efficienzaLimitatoreVelocita != null && (
                      <div>
                        <div className="text-xs text-slate-500">Efficienza limitatore di velocità</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.efficienzaLimitatoreVelocita ? "Sì" : "No"}</div>
                      </div>
                    )}
                    {detailData.efficienzaDispositiviSicurezza != null && (
                      <div>
                        <div className="text-xs text-slate-500">Efficienza dispositivi di sicurezza</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.efficienzaDispositiviSicurezza ? "Sì" : "No"}</div>
                      </div>
                    )}
                    {detailData.condizioneFuni && (
                      <div>
                        <div className="text-xs text-slate-500">Condizione delle funi</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.condizioneFuni}</div>
                      </div>
                    )}
                    {detailData.condizioneIsolamentoImpianto && (
                      <div>
                        <div className="text-xs text-slate-500">Condizione isolamento impianto elettrico</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.condizioneIsolamentoImpianto}</div>
                      </div>
                    )}
                    {detailData.efficienzaCollegamentiTerra != null && (
                      <div>
                        <div className="text-xs text-slate-500">Efficienza collegamenti con la terra</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.efficienzaCollegamentiTerra ? "Sì" : "No"}</div>
                      </div>
                    )}
                    {detailData.condizioniAttacchiFuni && (
                      <div>
                        <div className="text-xs text-slate-500">Condizioni attacchi funi</div>
                        <div className="text-sm font-medium text-slate-900">{detailData.condizioniAttacchiFuni}</div>
                      </div>
                    )}
                    {detailData.osservazioniSemestrale && (
                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500">Osservazioni</div>
                        <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.osservazioniSemestrale}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {detailData.note ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note</div>
                  <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{detailData.note}</div>
                </div>
              ) : null}
              {(detailData.firmaTecnico || detailData.firmaCliente) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailData.firmaTecnico ? (
                    <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma tecnico</div>
                      <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center">
                        <img
                          src={detailData.firmaTecnico}
                          alt="Firma tecnico"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                  {detailData.firmaCliente ? (
                    <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma cliente</div>
                      <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center">
                        <img
                          src={detailData.firmaCliente}
                          alt="Firma cliente"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

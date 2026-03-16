"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContrattoForm } from "./ContrattoForm";
import { deleteContratto } from "../actions";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";
import { formatEuro } from "@/lib/money";

export function ContrattiClient({
  contratti,
  impianti,
  permissions,
}: {
  contratti: any[];
  impianti: any[];
  permissions: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"attivi" | "non-attivi">("attivi");

  const canCreate = permissions?.CREATE;
  const canUpdate = permissions?.UPDATE;
  const canDelete = permissions?.DELETE;

  useEffect(() => {
    const contrId = searchParams.get("contr");
    if (contrId) router.replace(`/contratti/${contrId}`);
  }, [searchParams, router]);

  const handleEdit = (data: any) => {
    setEditingData(data);
    setIsOpen(true);
  };

  const handleAddNew = () => {
    setEditingData(null);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo contratto?")) {
      await deleteContratto(id);
    }
  };

  const handleOpenDetail = (data: any) => {
    router.push(`/contratti/${data.id}`);
  };

  const getTotaleContratto = (contratto: any) => {
    if (!contratto?.servizi || !Array.isArray(contratto.servizi)) return 0;
    return contratto.servizi.reduce(
      (acc: number, s: any) =>
        typeof s.importo === "number" ? acc + s.importo : acc,
      0
    );
  };

  const contrattiAttivi = contratti.filter(
    (c) => (c.statoContratto || "").toLowerCase() === "attivo"
  );
  const contrattiNonAttivi = contratti.filter(
    (c) => (c.statoContratto || "").toLowerCase() !== "attivo"
  );
  const numeroContrattiAttivi = contrattiAttivi.length;
  const numeroContrattiNonAttivi = contrattiNonAttivi.length;
  const sommaCanoneAttivi = contrattiAttivi.reduce(
    (acc, c) => acc + getTotaleContratto(c),
    0
  );
  const numeroConCanone = contrattiAttivi.filter(
    (c) => getTotaleContratto(c) > 0
  ).length;
  const canoneMedioAttivi =
    numeroConCanone > 0 ? sommaCanoneAttivi / numeroConCanone : 0;

  const filteredContratti =
    activeTab === "attivi"
      ? contratti.filter(
          (c) => (c.statoContratto || "").toLowerCase() === "attivo"
        )
      : contratti.filter(
          (c) => (c.statoContratto || "").toLowerCase() !== "attivo"
        );

  const impiantiList = Array.isArray(impianti) ? impianti : [];
  const assignedImpiantiIds = new Set(contratti.map((c) => c.impiantoId));
  const availableImpianti = impiantiList.filter(
    (imp) =>
      !assignedImpiantiIds.has(imp.id) ||
      (editingData && imp.id === editingData.impiantoId)
  );

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Contratti</h1>
          <p className="text-slate-500 font-medium mt-1">Gestione contratti di manutenzione</p>
        </div>
        {canCreate && (
          <Button onClick={handleAddNew} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            <Plus className="mr-2 h-5 w-5" /> NUOVO CONTRATTO
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-emerald-500 text-white px-6 py-4 shadow-sm flex flex-col items-center justify-center">
          <span className="text-sm md:text-base font-semibold tracking-wide">
            Contratti Attivi
          </span>
          <span className="text-3xl md:text-4xl font-black mt-1">
            {numeroContrattiAttivi}
          </span>
        </div>
        <div className="rounded-2xl bg-sky-500 text-white px-6 py-4 shadow-sm flex flex-col items-center justify-center">
          <span className="text-sm md:text-base font-semibold tracking-wide">
            Canone Medio (attivi)
          </span>
          <span className="text-2xl md:text-3xl font-black mt-1">
            {numeroConCanone > 0 ? formatEuro(canoneMedioAttivi) : "-"}
          </span>
        </div>
        <div className="rounded-2xl bg-orange-500 text-white px-6 py-4 shadow-sm flex flex-col items-center justify-center">
          <span className="text-sm md:text-base font-semibold tracking-wide">
            Contratti non Attivi
          </span>
          <span className="text-3xl md:text-4xl font-black mt-1">
            {numeroContrattiNonAttivi}
          </span>
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 bg-white border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("attivi")}
            className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === "attivi"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Attivi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("non-attivi")}
            className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide transition-colors ${
              activeTab === "non-attivi"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Non attivi
          </button>
        </div>
        <div className="overflow-x-auto pr-2 md:pr-4">
          {filteredContratti.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">
              Nessun contratto trovato.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredContratti.map((item) => {
                  const statoRaw = item.statoContratto || "";
                  const stato = statoRaw.toLowerCase();
                  const isActive = stato === "attivo";
                  const badgeClass = isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800";
                  const totale = getTotaleContratto(item);
                  return (
                    <div key={item.id} onClick={() => handleOpenDetail(item)} className="grid-table-mobile-card">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{item.numero || "-"}</p>
                          <p className="text-sm font-medium text-slate-800">{item.impianto?.numeroImpianto} · {item.impianto?.indirizzo}</p>
                          <p className="text-sm text-slate-700">{item.impianto?.cliente?.denominazione}</p>
                          <p className="text-sm text-slate-600">{item.tipologia}</p>
                          <p className="mt-1"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badgeClass}`}>{statoRaw}</span> · {totale > 0 ? formatEuro(totale) : "-"}</p>
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {canUpdate && <Button type="button" variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>}
                          {canDelete && <Button type="button" variant="outline" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <VirtualizedTable
                  items={filteredContratti}
                  rowHeight={48}
                  gridTemplateColumns="1.5fr 1.2fr 1.5fr 1fr 1fr 0.9fr 0.8fr"
                  maxHeight="60vh"
                  header={
                    <>
                      <TableTh>N°</TableTh>
                      <TableTh>Impianto</TableTh>
                      <TableTh>Cliente</TableTh>
                      <TableTh>Tipologia</TableTh>
                      <TableTh>Stato</TableTh>
                      <TableTh>Totale</TableTh>
                      <TableTh>Azioni</TableTh>
                    </>
                  }
                >
                  {(item) => {
                    const statoRaw = item.statoContratto || "";
                    const stato = statoRaw.toLowerCase();
                    const isActive = stato === "attivo";
                    const badgeClass = isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800";
                    const totale = getTotaleContratto(item);
                    const impiantoLine = item.impianto ? (item.impianto.indirizzo ? `${item.impianto.numeroImpianto} · ${item.impianto.indirizzo}, ${item.impianto.comune || ""}` : `${item.impianto.numeroImpianto} · ${item.impianto.comune || ""}`).trim() : "-";
                    return (
                      <>
                        <TableTd className="truncate cursor-pointer font-semibold" onClick={() => handleOpenDetail(item)}>{item.numero || "-"}</TableTd>
                        <TableTd className="truncate cursor-pointer font-medium" title={item.impianto?.indirizzo} onClick={() => handleOpenDetail(item)}>{impiantoLine}</TableTd>
                        <TableTd className="truncate cursor-pointer" title={item.impianto?.cliente?.denominazione} onClick={() => handleOpenDetail(item)}>{item.impianto?.cliente?.denominazione}</TableTd>
                        <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(item)}>{item.tipologia}</TableTd>
                        <TableTd className="cursor-pointer" onClick={() => handleOpenDetail(item)}><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badgeClass}`}>{statoRaw}</span></TableTd>
                        <TableTd className="right cursor-pointer font-semibold" onClick={() => handleOpenDetail(item)}>{totale > 0 ? formatEuro(totale) : "-"}</TableTd>
                        <TableTd className="actions" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {canUpdate && <Button type="button" variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>}
                            {canDelete && <Button type="button" variant="outline" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[24px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {editingData ? "MODIFICA CONTRATTO" : "NUOVO CONTRATTO"}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-4 shadow-sm">
            <ContrattoForm
              defaultValues={editingData || undefined}
              impianti={availableImpianti}
              onSuccess={() => setIsOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

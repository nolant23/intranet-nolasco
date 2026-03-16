"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Trash2, Plus } from "lucide-react";
import { TableSearch } from "@/components/table/TableSearch";
import { VirtualizedTable, TableTh, TableTd } from "@/components/table/VirtualizedTable";
import { importBookingCsv, importCondizioniPagamentoCsv, deleteBooking } from "../actions";

export function BookingClient({
  bookings,
  permissions,
}: {
  bookings: any[];
  permissions: any;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importingCondizioni, setImportingCondizioni] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const condizioniFileRef = useRef<HTMLInputElement>(null);

  const canCreate = permissions?.CREATE;
  const canDelete = permissions?.DELETE;

  const handleOpenDetail = (id: string) => {
    router.push(`/booking/${id}`);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await importBookingCsv(text);
      if (res.imported > 0) {
        alert(`Importati ${res.imported} booking.${res.errors.length > 0 ? `\nErrori: ${res.errors.slice(0, 5).join("\n")}` : ""}`);
        router.refresh();
      }
      if (res.errors.length > 0 && res.imported === 0) {
        alert("Nessun booking importato.\n" + res.errors.slice(0, 5).join("\n"));
      }
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleImportCondizioniCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCondizioni(true);
    try {
      const text = await file.text();
      const res = await importCondizioniPagamentoCsv(text);
      const msg = `Importate ${res.imported} condizioni, saltate ${res.skipped} righe.${res.errors.length > 0 ? `\nErrori: ${res.errors.slice(0, 5).join("\n")}` : ""}`;
      alert(msg);
      if (res.imported > 0) router.refresh();
    } finally {
      setImportingCondizioni(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo booking?")) return;
    const res = await deleteBooking(id);
    if (res?.success) router.refresh();
    else alert(res?.error);
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b: any) =>
        [b.codiceImpianto, b.indirizzoImpianto, b.comuneImpianto, b.tipologiaImpianto, b.statoMontaggio]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)) ||
        (b.clienti || []).some((bc: any) => bc.cliente?.denominazione?.toLowerCase().includes(q))
    );
  }, [bookings, search]);

  const clientiLabel = (b: any) =>
    (b.clienti || []).map((bc: any) => bc.cliente?.denominazione).filter(Boolean).join(", ") || "-";

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Booking</h1>
          <p className="text-slate-500 font-medium mt-1">Vendite nuovi impianti</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {canCreate && (
            <>
              <Link
                href="/booking/nuovo"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white")}
              >
                <Plus className="mr-2 h-5 w-5" />
                Nuovo Impianto
              </Link>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto uppercase tracking-wider"
              >
                <Upload className="mr-2 h-5 w-5" />
                {importing ? "Importazione..." : "Importa da CSV"}
              </Button>
              <input
                ref={condizioniFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCondizioniCsv}
              />
              <Button
                onClick={() => condizioniFileRef.current?.click()}
                disabled={importingCondizioni}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto uppercase tracking-wider"
              >
                <Upload className="mr-2 h-5 w-5" />
                {importingCondizioni ? "Importazione..." : "Importa condizioni pagamento CSV"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid-table-card overflow-hidden">
        <div className="flex justify-start px-4 pt-4 pb-4">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Cerca per impianto, indirizzo, cliente, tipologia..."
          />
        </div>
        <div className="overflow-x-auto pr-2 md:pr-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-12 bg-white rounded-xl">
              Nessun booking trovato. Usa &quot;Importa da CSV&quot; per caricare i dati.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredBookings.map((b: any) => (
                  <div
                    key={b.id}
                    onClick={() => handleOpenDetail(b.id)}
                    className="grid-table-mobile-card cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900">{b.codiceImpianto}</div>
                    <div className="text-sm text-slate-600">{b.indirizzoImpianto} · {b.comuneImpianto}</div>
                    <div className="text-sm text-slate-500">Clienti: {clientiLabel(b)}</div>
                    <div className="text-sm text-slate-500">{b.tipologiaImpianto} · {b.statoMontaggio || "-"}</div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {canDelete && (
                        <Button variant="outline" size="icon" onClick={() => handleDelete(b.id)} className="h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <VirtualizedTable
                  items={filteredBookings}
                  rowHeight={48}
                  gridTemplateColumns="1fr 1.8fr 1.2fr 1.2fr 1fr 0.8fr"
                  maxHeight="60vh"
                  header={
                    <>
                      <TableTh>Numero impianto</TableTh>
                      <TableTh>Indirizzo / Comune</TableTh>
                      <TableTh>Clienti</TableTh>
                      <TableTh>Tipologia</TableTh>
                      <TableTh>Data contratto</TableTh>
                      <TableTh>Azioni</TableTh>
                    </>
                  }
                >
                  {(b) => (
                    <>
                      <TableTd className="truncate cursor-pointer font-semibold" onClick={() => handleOpenDetail(b.id)}>
                        {b.codiceImpianto}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(b.id)} title={`${b.indirizzoImpianto || ""} ${b.comuneImpianto || ""}`}>
                        {[b.indirizzoImpianto, b.comuneImpianto].filter(Boolean).join(" · ") || "-"}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(b.id)} title={clientiLabel(b)}>
                        {clientiLabel(b)}
                      </TableTd>
                      <TableTd className="truncate cursor-pointer" onClick={() => handleOpenDetail(b.id)}>
                        {b.tipologiaImpianto || "-"}
                      </TableTd>
                      <TableTd className="cursor-pointer" onClick={() => handleOpenDetail(b.id)}>
                        {b.dataContratto ? new Date(b.dataContratto).toLocaleDateString("it-IT") : "-"}
                      </TableTd>
                      <TableTd className="actions" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {canDelete && (
                            <Button variant="outline" size="icon" onClick={() => handleDelete(b.id)} className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableTd>
                    </>
                  )}
                </VirtualizedTable>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRef, useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { createBooking, updateBooking, uploadBookingDocument, createCondizionePagamento, updateCondizionePagamento, deleteCondizionePagamento, getFattureDisponibiliPerCondizione } from "../actions";
import {
  TIPOLOGIA_IMPIANTO_OPTIONS,
  MODELLO_IMPIANTO_OPTIONS,
  STATO_MATERIALI_OPTIONS,
  STATO_MONTAGGIO_OPTIONS,
} from "../constants";

const bookingSchema = z.object({
  codiceImpianto: z.string().min(1, "Codice impianto obbligatorio"),
  indirizzoImpianto: z.string().optional(),
  comuneImpianto: z.string().optional(),
  provinciaImpianto: z.string().optional(),
  capImpianto: z.string().optional(),
  dataContratto: z.string().optional(),
  tipologiaImpianto: z.string().optional(),
  modelloImpianto: z.string().optional(),
  statoMateriali: z.string().optional(),
  montaggio: z.union([z.string(), z.number()]).optional().transform((v) => (v === "" || v == null ? undefined : Number(v))),
  statoMontaggio: z.string().optional(),
  inizioMontaggio: z.string().optional(),
  fineMontaggio: z.string().optional(),
  progettazione: z.union([z.string(), z.number()]).optional().transform((v) => (v === "" || v == null ? undefined : Number(v))),
  enteNotificato: z.string().optional(),
  nIdentificazioneEnte: z.string().optional(),
  nAttestato: z.string().optional(),
  contrattoFirmatoUrl: z.string().optional(),
  disegnoDefinitivoUrl: z.string().optional(),
  dm37Url: z.string().optional(),
});

type BookingFormValues = z.input<typeof bookingSchema>;

type CondizioneRow = { id?: string; condizione: string; importo: number; importoPagato: number; fatturaFicId: string };

function formatDateForInput(isoDate?: string | Date | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

interface BookingFormProps {
  bookingId?: string;
  defaultValues?: any;
  onSuccess: (id: string) => void;
}

const emptyCondizione = (): CondizioneRow => ({ condizione: "", importo: 0, importoPagato: 0, fatturaFicId: "" });

type FatturaOption = { ficId: string; numero: string; data: string; oggetto: string };

/** Converte data in formato YYYY-MM-DD in DD/MM/YYYY */
function formatDataFattura(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return isoDate;
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

function FatturaSelectForCondizione({
  codiceImpianto,
  condizioneId,
  value,
  onChange,
}: {
  codiceImpianto: string;
  condizioneId?: string;
  value: string;
  onChange: (ficId: string) => void;
}) {
  const [options, setOptions] = useState<FatturaOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!codiceImpianto.trim()) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFattureDisponibiliPerCondizione(codiceImpianto, condizioneId ?? undefined)
      .then((list) => {
        if (!cancelled) setOptions(list.map((f) => ({ ficId: f.ficId, numero: f.numero, data: f.data, oggetto: "oggetto" in f && f.oggetto != null ? f.oggetto : "" })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codiceImpianto, condizioneId]);

  const selected = value ? options.find((o) => o.ficId === value) : null;

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" || v == null ? "" : v)}
      disabled={!codiceImpianto.trim() || loading}
    >
      <SelectTrigger className="mt-1 w-full min-w-0">
        <SelectValue
          placeholder={
            !codiceImpianto.trim()
              ? "Inserisci numero impianto"
              : loading
                ? "Caricamento..."
                : "Nessuna fattura"
          }
        >
          {selected
            ? `${selected.numero} (${formatDataFattura(selected.data)})${selected.oggetto ? ` · ${selected.oggetto}` : ""}`
            : value
              ? `ficId: ${value}`
              : "Nessuna fattura"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-w-[min(500px,95vw)]">
        <SelectItem value="none">Nessuna fattura</SelectItem>
        {value && !options.some((o) => o.ficId === value) && (
          <SelectItem value={value}>ficId: {value}</SelectItem>
        )}
        {options.map((f) => (
          <SelectItem key={f.ficId} value={f.ficId} className="whitespace-normal py-2">
            <span className="block" title={f.oggetto || undefined}>
              {f.numero} ({formatDataFattura(f.data)}){f.oggetto ? ` · ${f.oggetto}` : ""}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BookingForm({ bookingId, defaultValues, onSuccess }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [condizioni, setCondizioni] = useState<CondizioneRow[]>(() => {
    const list = defaultValues?.condizioniPagamento;
    if (!list?.length) return [];
    return list.map((cp: any) => ({
      id: cp.id,
      condizione: cp.condizione ?? "",
      importo: Number(cp.importo) || 0,
      importoPagato: Number(cp.importoPagato) || 0,
      fatturaFicId: cp.fatturaFicId ?? "",
    }));
  });
  const contrattoFileRef = useRef<HTMLInputElement>(null);
  const disegnoFileRef = useRef<HTMLInputElement>(null);
  const dm37FileRef = useRef<HTMLInputElement>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: defaultValues
      ? {
          codiceImpianto: defaultValues.codiceImpianto ?? "",
          indirizzoImpianto: defaultValues.indirizzoImpianto ?? "",
          comuneImpianto: defaultValues.comuneImpianto ?? "",
          provinciaImpianto: defaultValues.provinciaImpianto ?? "",
          capImpianto: defaultValues.capImpianto ?? "",
          dataContratto: formatDateForInput(defaultValues.dataContratto),
          tipologiaImpianto: defaultValues.tipologiaImpianto ?? "",
          modelloImpianto: defaultValues.modelloImpianto ?? "",
          statoMateriali: defaultValues.statoMateriali ?? "",
          montaggio: defaultValues.montaggio ?? "",
          statoMontaggio: defaultValues.statoMontaggio ?? "",
          inizioMontaggio: formatDateForInput(defaultValues.inizioMontaggio),
          fineMontaggio: formatDateForInput(defaultValues.fineMontaggio),
          progettazione: defaultValues.progettazione ?? "",
          enteNotificato: defaultValues.enteNotificato ?? "",
          nIdentificazioneEnte: defaultValues.nIdentificazioneEnte ?? "",
          nAttestato: defaultValues.nAttestato ?? "",
          contrattoFirmatoUrl: defaultValues.contrattoFirmatoUrl ?? "",
          disegnoDefinitivoUrl: defaultValues.disegnoDefinitivoUrl ?? "",
          dm37Url: defaultValues.dm37Url ?? "",
        }
      : {
          codiceImpianto: "",
          indirizzoImpianto: "",
          comuneImpianto: "",
          provinciaImpianto: "",
          capImpianto: "",
          dataContratto: "",
          tipologiaImpianto: "",
          modelloImpianto: "",
          statoMateriali: "",
          montaggio: "",
          statoMontaggio: "",
          inizioMontaggio: "",
          fineMontaggio: "",
          progettazione: "",
          enteNotificato: "",
          nIdentificazioneEnte: "",
          nAttestato: "",
          contrattoFirmatoUrl: "",
          disegnoDefinitivoUrl: "",
          dm37Url: "",
        },
  });

  const isEdit = Boolean(bookingId);

  const toNumber = (v: string | number | undefined): number | null =>
    v === "" || v == null ? null : Number(v);

  const onSubmit = async (values: BookingFormValues) => {
    setLoading(true);
    try {
      let contrattoFirmatoUrl = values.contrattoFirmatoUrl || null;
      let disegnoDefinitivoUrl = values.disegnoDefinitivoUrl || null;
      let dm37Url = values.dm37Url || null;

      const uploadFile = async (file: File): Promise<string | null> => {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadBookingDocument(fd);
        return res.url;
      };

      if (contrattoFileRef.current?.files?.[0]) {
        const url = await uploadFile(contrattoFileRef.current.files[0]);
        if (url) contrattoFirmatoUrl = url;
      }
      if (disegnoFileRef.current?.files?.[0]) {
        const url = await uploadFile(disegnoFileRef.current.files[0]);
        if (url) disegnoDefinitivoUrl = url;
      }
      if (dm37FileRef.current?.files?.[0]) {
        const url = await uploadFile(dm37FileRef.current.files[0]);
        if (url) dm37Url = url;
      }

      const dataContratto = values.dataContratto ? new Date(values.dataContratto) : null;
      const inizioMontaggio = values.inizioMontaggio ? new Date(values.inizioMontaggio) : null;
      const fineMontaggio = values.fineMontaggio ? new Date(values.fineMontaggio) : null;
      const montaggio = toNumber(values.montaggio);
      const progettazione = toNumber(values.progettazione);

      if (isEdit) {
        const res = await updateBooking(bookingId!, {
          codiceImpianto: values.codiceImpianto,
          indirizzoImpianto: values.indirizzoImpianto || null,
          comuneImpianto: values.comuneImpianto || null,
          provinciaImpianto: values.provinciaImpianto || null,
          capImpianto: values.capImpianto || null,
          dataContratto,
          tipologiaImpianto: values.tipologiaImpianto || null,
          modelloImpianto: values.modelloImpianto || null,
          statoMateriali: values.statoMateriali || null,
          montaggio,
          statoMontaggio: values.statoMontaggio || null,
          inizioMontaggio,
          fineMontaggio,
          progettazione,
          enteNotificato: values.enteNotificato || null,
          nIdentificazioneEnte: values.nIdentificazioneEnte || null,
          nAttestato: values.nAttestato || null,
          contrattoFirmatoUrl,
          disegnoDefinitivoUrl,
          dm37Url,
        });
        if (!res.success) {
          alert(res.error);
          return;
        }
        const existingIds = (defaultValues?.condizioniPagamento ?? []).map((c: any) => c.id).filter(Boolean);
        const keptIds = condizioni.filter((c) => c.id).map((c) => c.id);
        for (const id of existingIds) {
          if (!keptIds.includes(id)) {
            await deleteCondizionePagamento(id);
          }
        }
        for (const row of condizioni) {
          const condizione = String(row.condizione).trim();
          if (!condizione) continue;
          if (row.id) {
            await updateCondizionePagamento(row.id, {
              condizione,
              importo: row.importo,
              importoPagato: row.importoPagato ?? 0,
              fatturaFicId: row.fatturaFicId?.trim() || null,
            });
          } else {
            await createCondizionePagamento({
              bookingId: bookingId!,
              condizione,
              importo: row.importo,
              importoPagato: row.importoPagato ?? 0,
              fatturaFicId: row.fatturaFicId?.trim() || null,
            });
          }
        }
        onSuccess(bookingId!);
      } else {
        const res = await createBooking({
          codiceImpianto: values.codiceImpianto,
          indirizzoImpianto: values.indirizzoImpianto || null,
          comuneImpianto: values.comuneImpianto || null,
          provinciaImpianto: values.provinciaImpianto || null,
          capImpianto: values.capImpianto || null,
          dataContratto,
          tipologiaImpianto: values.tipologiaImpianto || null,
          modelloImpianto: values.modelloImpianto || null,
          statoMateriali: values.statoMateriali || null,
          montaggio,
          statoMontaggio: values.statoMontaggio || null,
          inizioMontaggio,
          fineMontaggio,
          progettazione,
          enteNotificato: values.enteNotificato || null,
          nIdentificazioneEnte: values.nIdentificazioneEnte || null,
          nAttestato: values.nAttestato || null,
          contrattoFirmatoUrl,
          disegnoDefinitivoUrl,
          dm37Url,
        });
        if (!res.success) {
          alert((res as { error?: string }).error ?? "Errore");
          return;
        }
        const newId = (res as { id?: string }).id;
        if (newId) {
          for (const row of condizioni) {
            const condizione = String(row.condizione).trim();
            if (!condizione) continue;
            await createCondizionePagamento({
              bookingId: newId,
              condizione,
              importo: row.importo,
              importoPagato: row.importoPagato ?? 0,
              fatturaFicId: row.fatturaFicId?.trim() || null,
            });
          }
        }
        onSuccess(newId!);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Impianto e indirizzo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codiceImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero impianto *</FormLabel>
                  <FormControl>
                    <Input placeholder="es. A21K0100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="indirizzoImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comuneImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comune</FormLabel>
                  <ComuneAutocomplete
                    value={field.value}
                    onSelectData={(comune, cap, provincia) => {
                      form.setValue("comuneImpianto", comune);
                      form.setValue("capImpianto", cap);
                      form.setValue("provinciaImpianto", provincia);
                    }}
                    error={!!form.formState.errors.comuneImpianto}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provinciaImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Contratto e montaggio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="dataContratto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data contratto</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipologiaImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipologia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipologia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOLOGIA_IMPIANTO_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelloImpianto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modello</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona modello" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODELLO_IMPIANTO_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="statoMateriali"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato materiali</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATO_MATERIALI_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montaggio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montaggio (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="statoMontaggio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato montaggio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATO_MONTAGGIO_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inizioMontaggio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inizio montaggio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fineMontaggio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fine montaggio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="progettazione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progettazione (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enteNotificato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ente notificato</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nIdentificazioneEnte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N. identificazione ente</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nAttestato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N. attestato</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Condizioni di pagamento</h2>
          <div className="space-y-3">
            {condizioni.map((row, index) => (
              <div key={row.id ?? `new-${index}`} className="flex flex-nowrap items-end gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex flex-1 flex-nowrap items-end gap-3 min-w-0">
                  <div className="flex-[0_0_35%] min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condizione</label>
                    <Input
                      value={row.condizione}
                      onChange={(e) => {
                        const next = [...condizioni];
                        next[index] = { ...next[index], condizione: e.target.value };
                        setCondizioni(next);
                      }}
                      placeholder="es. 30% ALL'ORDINE"
                      className="mt-1 w-full"
                    />
                  </div>
                  <div className="flex-[0_0_10%] min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Importo (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.importo || ""}
                      onChange={(e) => {
                        const next = [...condizioni];
                        next[index] = { ...next[index], importo: parseFloat(e.target.value) || 0 };
                        setCondizioni(next);
                      }}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div className="flex-[0_0_10%] min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pagato (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.importoPagato ?? ""}
                      onChange={(e) => {
                        const next = [...condizioni];
                        next[index] = { ...next[index], importoPagato: parseFloat(e.target.value) || 0 };
                        setCondizioni(next);
                      }}
                      className="mt-1 w-full"
                    />
                  </div>
                  <div className="flex-[0_0_10%] min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Da pagare (€)</label>
                    <Input
                      readOnly
                      type="number"
                      step="0.01"
                      value={Math.max(0, (row.importo || 0) - (row.importoPagato || 0))}
                      className="mt-1 w-full bg-muted"
                    />
                  </div>
                  <div className="flex-[1_1_35%] min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fattura</label>
                    <FatturaSelectForCondizione
                      codiceImpianto={defaultValues?.codiceImpianto ?? form.watch("codiceImpianto") ?? ""}
                      condizioneId={row.id}
                      value={row.fatturaFicId}
                      onChange={(ficId) => {
                        const next = [...condizioni];
                        next[index] = { ...next[index], fatturaFicId: ficId };
                        setCondizioni(next);
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setCondizioni(condizioni.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setCondizioni([...condizioni, emptyCondizione()])}
            >
              <Plus className="h-4 w-4" /> Aggiungi condizione
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-4">Documenti</h2>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="contrattoFirmatoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contratto firmato</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        ref={contrattoFileRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        onChange={() => {}}
                      />
                      {field.value && (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Documento attuale
                        </a>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disegnoDefinitivoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disegno definitivo</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        ref={disegnoFileRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        onChange={() => {}}
                      />
                      {field.value && (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Documento attuale
                        </a>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dm37Url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DM37</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        ref={dm37FileRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                        onChange={() => {}}
                      />
                      {field.value && (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Documento attuale
                        </a>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea impianto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

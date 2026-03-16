"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { saveContratto } from "../actions";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const OPZIONI_SERVIZI = [
  "MANUTENZIONE ORDINARIA",
  "COMUNICAZIONE GSM",
  "SERVIZIO DI REPERIBILITA' 24h/24",
  "ASSISTENZA VISITA PERIODICA",
  "ESTENSIONE POLIZZA ASSICURATIVA",
  "DISINFEZIONE FOSSA"
];

const contrattoSchema = z.object({
  id: z.string().optional(),
  impiantoId: z.string().min(1, "Seleziona un impianto"),
  tipologia: z.string().min(1, "Obbligatorio"),
  dataEmissione: z.string().min(1, "Obbligatorio"),
  dataContratto: z.string().optional(),
  scadenzaContratto: z.string().optional(),
  statoContratto: z.string().min(1, "Obbligatorio"),
  durataAnni: z.coerce.number().optional(),
  numeroVisiteAnnue: z.coerce.number().optional(),
  canoneManutenzione: z.coerce.number().optional(),
  periodicitaFatturazione: z.string().optional(),
  dataInizioFatturazione: z.string().optional(),
  gratuito: z.boolean().optional(),
      servizi: z.array(
    z.object({
      nome: z.string().min(1, "Obbligatorio"),
      importo: z.coerce.number().optional(),
      iva: z.string().optional(),
      ra: z.boolean().optional(),
    })
  ).optional(),
});

type FormValues = z.infer<typeof contrattoSchema>;

interface Props {
  defaultValues?: any;
  impianti: any[];
  onSuccess: () => void;
}

export function ContrattoForm({ defaultValues, impianti, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  // Format dates for input type="date"
  const formatDateForInput = (isoDate?: string | Date) => {
    if (!isoDate) return "";
    return new Date(isoDate).toISOString().split("T")[0];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(contrattoSchema) as any,
    defaultValues: {
      id: defaultValues?.id || undefined,
      impiantoId: defaultValues?.impiantoId || "",
      tipologia: defaultValues?.tipologia || "OA Semplice",
      dataEmissione: formatDateForInput(defaultValues?.dataEmissione) || formatDateForInput(new Date()),
      dataContratto: formatDateForInput(defaultValues?.dataContratto),
      scadenzaContratto: formatDateForInput(defaultValues?.scadenzaContratto),
      statoContratto: defaultValues?.statoContratto || "Attivo",
      durataAnni: defaultValues?.durataAnni || undefined,
      numeroVisiteAnnue: defaultValues?.numeroVisiteAnnue || undefined,
      canoneManutenzione: defaultValues?.canoneManutenzione || 0,
      periodicitaFatturazione: defaultValues?.periodicitaFatturazione || "",
      dataInizioFatturazione: formatDateForInput(defaultValues?.dataInizioFatturazione),
      gratuito: defaultValues?.gratuito ?? false,
      servizi: defaultValues?.servizi || [
        {
          nome: "MANUTENZIONE ORDINARIA",
          importo: undefined,
          iva: "10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008",
          ra: false,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "servizi",
    control: form.control,
  });

  const watchServizi = useWatch({
    control: form.control,
    name: "servizi"
  });

  useEffect(() => {
    if (watchServizi) {
      const totale = watchServizi.reduce((acc, curr) => acc + (Number(curr?.importo) || 0), 0);
      form.setValue("canoneManutenzione", totale);
    }
  }, [watchServizi, form]);

  const handleAddServizio = () => {
    // Find the first available service that hasn't been selected yet
    const selectedNomi = watchServizi ? watchServizi.map((s) => s.nome) : [];
    const availableOpzioni = OPZIONI_SERVIZI.filter(opz => !selectedNomi.includes(opz));
    
    // Default to the first available option, or empty string if all are used
    const nextNome = availableOpzioni.length > 0 ? availableOpzioni[0] : "";
    
    if (nextNome) {
      append({
        nome: nextNome,
        importo: undefined,
        iva: "10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008",
        ra: false,
      });
    } else {
      // Fallback if all options are somehow selected but they still try to add
      append({
        nome: "",
        importo: undefined,
        iva: "10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008",
        ra: false,
      });
    }
  };

  async function onSubmit(data: FormValues) {
    setLoading(true);
    
    // Prepare dates
    const safeData: any = { ...data };
    delete safeData.servizi;

    if (safeData.dataEmissione) safeData.dataEmissione = new Date(safeData.dataEmissione);
    if (safeData.dataContratto) safeData.dataContratto = new Date(safeData.dataContratto);
    else safeData.dataContratto = null;
    if (safeData.scadenzaContratto) safeData.scadenzaContratto = new Date(safeData.scadenzaContratto);
    else safeData.scadenzaContratto = null;
    if (safeData.dataInizioFatturazione) safeData.dataInizioFatturazione = new Date(safeData.dataInizioFatturazione);
    else safeData.dataInizioFatturazione = null;

    const res = await saveContratto(safeData, data.servizi || []);
    setLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {impianti.length === 0 && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 font-medium">
            Attenzione: in anagrafica non è presente nessun impianto privo di contratto.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="impiantoId"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Impianto Collegato</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona...">
                        {field.value
                          ? (() => {
                              const imp = impianti.find(
                                (i) => i.id === field.value
                              );
                              return imp
                                ? `${imp.numeroImpianto || "-"} - ${
                                    imp.indirizzo
                                  }, ${imp.comune} (${
                                    imp.cliente?.denominazione
                                  })`
                                : "";
                            })()
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {impianti.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.numeroImpianto} - {i.indirizzo}, {i.comune} (
                        {i.cliente?.denominazione})
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
            name="tipologia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia Contratto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OA Semplice">OA Semplice</SelectItem>
                    <SelectItem value="T Pattochiaro (Semitotale)">T Pattochiaro (Semitotale)</SelectItem>
                    <SelectItem value="OM Completa">OM Completa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="statoContratto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato Contratto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Attivo">Attivo</SelectItem>
                    <SelectItem value="Non Attivo">Non Attivo</SelectItem>
                    <SelectItem value="Disdettato">Disdettato</SelectItem>
                    <SelectItem value="Offerta">Offerta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataEmissione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Emissione</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataContratto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Contratto</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scadenzaContratto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scadenza Contratto</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durataAnni"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durata (Anni)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numeroVisiteAnnue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero visite annue</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="canoneManutenzione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Totale manutenzione (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" readOnly className="bg-muted font-bold text-lg" {...field} value={field.value || 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="periodicitaFatturazione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Periodicità Fatturazione</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Mensile">Mensile</SelectItem>
                    <SelectItem value="Trimestrale">Trimestrale</SelectItem>
                    <SelectItem value="Semestrale">Semestrale</SelectItem>
                    <SelectItem value="Annuale">Annuale</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataInizioFatturazione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data inizio fatturazione</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gratuito"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 mt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    className="h-5 w-5 rounded-md border-slate-300"
                  />
                </FormControl>
                <FormLabel className="text-sm font-semibold text-slate-700">
                  Contratto gratuito (non generare fatture)
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Servizi</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddServizio}>
              <Plus className="h-4 w-4 mr-1" /> Aggiungi
            </Button>
          </div>
          
          <div className="space-y-3">
            {fields.map((field, index) => {
              const selectedNomi = watchServizi ? watchServizi.map((s) => s.nome) : [];
              const currentNome = watchServizi?.[index]?.nome;

              return (
                <div
                  key={field.id}
                  className="flex flex-col md:flex-row items-start gap-3 md:items-center"
                >
                  <div className="w-full md:flex-1">
                    <FormField
                      control={form.control}
                      name={`servizi.${index}.nome`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona servizio..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-[320px] max-w-[90vw]">
                              {OPZIONI_SERVIZI.filter(
                                (opz) => !selectedNomi.includes(opz) || opz === currentNome
                              ).map((opz) => (
                                <SelectItem key={opz} value={opz}>
                                  <span className="whitespace-normal break-words">
                                    {opz}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-full md:w-[120px]">
                    <FormField
                      control={form.control}
                      name={`servizi.${index}.importo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Importo €"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-full md:w-[260px]">
                    <FormField
                      control={form.control}
                      name={`servizi.${index}.iva`}
                      render={({ field }) => {
                        const value =
                          field.value ||
                          "10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008";
                        const shortLabel =
                          value ===
                          "10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008"
                            ? "10% Art.1 c.18 L.244/2007"
                            : value ===
                              "Reverse Charge - esente iva ai sensi dell’art. 17 comma 6, lettera a-ter del d.P.R. 633/72"
                            ? "Reverse Charge art.17 c.6 a-ter"
                            : value;
                        return (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={value}>
                              <FormControl>
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Seleziona IVA...">
                                    {shortLabel}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="w-[420px] max-w-[90vw]">
                                <SelectItem value="10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008">
                                  <span className="whitespace-normal break-words text-xs">
                                    10% Art.1 comma 18 legge n.244 del 24/12/2007 - Fin.2008
                                  </span>
                                </SelectItem>
                                <SelectItem value="22%">
                                  <span className="whitespace-normal break-words text-xs">
                                    22%
                                  </span>
                                </SelectItem>
                                <SelectItem value="Reverse Charge - esente iva ai sensi dell’art. 17 comma 6, lettera a-ter del d.P.R. 633/72">
                                  <span className="whitespace-normal break-words text-xs">
                                    Reverse Charge - esente iva ai sensi dell’art. 17 comma 6,
                                    lettera a-ter del d.P.R. 633/72
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-start md:justify-center gap-2 w-full md:w-[100px] md:self-center">
                    <FormField
                      control={form.control}
                      name={`servizi.${index}.ra`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel className="text-xs font-semibold text-slate-600">
                            RA
                          </FormLabel>
                          <FormControl>
                            <Checkbox
                              checked={field.value ?? false}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true)
                              }
                              className="h-7 w-7 rounded-md border-slate-300"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end w-full md:w-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : "SALVA CONTRATTO"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

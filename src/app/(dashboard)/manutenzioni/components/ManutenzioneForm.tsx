"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { saveManutenzione, getUltimeManutenzioniPerImpianto } from "../actions";
import { useState, useRef, useEffect, useTransition } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useOffline } from "@/contexts/OfflineContext";

const manutenzioneSchema = z.object({
  id: z.string().optional(),
  dataManutenzione: z.string().min(1, "Obbligatorio"),
  oraEsecuzione: z.string().optional().nullable(),
  tecnicoId: z.string().min(1, "Obbligatorio"),
  impiantoId: z.string().min(1, "Obbligatorio"),
  clienteFirmatario: z.string().min(2, "Obbligatorio"),
  firmaTecnico: z.string().min(1, "Firma tecnico obbligatoria"),
  firmaCliente: z.string().min(1, "Firma cliente obbligatoria"),
  note: z.string().optional().nullable(),
  // Campi semestrale: tutti opzionali
  effettuaSemestrale: z.boolean().optional(),
  efficienzaParacadute: z.boolean().optional().nullable(),
  efficienzaLimitatoreVelocita: z.boolean().optional().nullable(),
  efficienzaDispositiviSicurezza: z.boolean().optional().nullable(),
  condizioneFuni: z.string().optional().nullable(),
  condizioniAttacchiFuni: z.string().optional().nullable(),
  condizioneIsolamentoImpianto: z.string().optional().nullable(),
  efficienzaCollegamentiTerra: z.boolean().optional().nullable(),
  osservazioniSemestrale: z.string().optional().nullable(),
});

type ManutenzioneFormValues = z.infer<typeof manutenzioneSchema>;

interface ManutenzioneFormProps {
  defaultValues?: any;
  impiantiDaManutenere: any[];
  tecnici: any[];
  currentUser: any;
  onSuccess: () => void;
}

export function ManutenzioneForm({
  defaultValues,
  impiantiDaManutenere,
  tecnici,
  currentUser,
  onSuccess,
}: ManutenzioneFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStorico, startTransition] = useTransition();
  const [ultimaManutenzione, setUltimaManutenzione] = useState<any | null>(
    null
  );
  const [ultimaSemestrale, setUltimaSemestrale] = useState<any | null>(null);
  const firmaTecnicoRef = useRef<SignatureCanvas>(null);
  const firmaClienteRef = useRef<SignatureCanvas>(null);
  const { isOnline, addToQueue } = useOffline();

  // Se l'utente è un tecnico, il tecnicoId è bloccato al suo ID.
  const isTecnico = currentUser?.role === "TECNICO";
  const defaultTecnicoId = isTecnico ? currentUser.id : "";

  // Se stiamo modificando e l'impianto non è in impiantiDaManutenere (perché è già stato manutenuto), lo aggiungiamo temporaneamente all'elenco per poterlo mostrare nella Select
  const availableImpianti = [...impiantiDaManutenere];
  if (defaultValues?.impianto) {
    if (!availableImpianti.some(i => i.id === defaultValues.impianto.id)) {
      availableImpianti.push(defaultValues.impianto);
    }
  }

  const form = useForm<ManutenzioneFormValues>({
    resolver: zodResolver(manutenzioneSchema),
    defaultValues: defaultValues ? {
      id: defaultValues.id,
      dataManutenzione: new Date(defaultValues.dataManutenzione).toISOString().split('T')[0],
      tecnicoId: defaultValues.tecnicoId,
      impiantoId: defaultValues.impiantoId,
      clienteFirmatario: defaultValues.clienteFirmatario,
      firmaTecnico: defaultValues.firmaTecnico,
      firmaCliente: defaultValues.firmaCliente,
      note: defaultValues.note || "",
      oraEsecuzione: defaultValues.oraEsecuzione ?? "",
      effettuaSemestrale: !!defaultValues.effettuaSemestrale,
      efficienzaParacadute: defaultValues.efficienzaParacadute ?? null,
      efficienzaLimitatoreVelocita: defaultValues.efficienzaLimitatoreVelocita ?? null,
      efficienzaDispositiviSicurezza: defaultValues.efficienzaDispositiviSicurezza ?? null,
      condizioneFuni: defaultValues.condizioneFuni ?? null,
      condizioniAttacchiFuni: defaultValues.condizioniAttacchiFuni ?? null,
      condizioneIsolamentoImpianto: defaultValues.condizioneIsolamentoImpianto ?? null,
      efficienzaCollegamentiTerra: defaultValues.efficienzaCollegamentiTerra ?? null,
      osservazioniSemestrale: defaultValues.osservazioniSemestrale ?? null,
    } : {
      dataManutenzione: new Date().toISOString().split('T')[0],
      oraEsecuzione: "",
      tecnicoId: defaultTecnicoId,
      impiantoId: "",
      clienteFirmatario: "",
      firmaTecnico: "",
      firmaCliente: "",
      note: "",
    },
  });

  const effettuaSemestrale = useWatch({
    control: form.control,
    name: "effettuaSemestrale",
  });

  const selectedImpiantoId = useWatch({
    control: form.control,
    name: "impiantoId",
  });

  useEffect(() => {
    if (!selectedImpiantoId) {
      setUltimaManutenzione(null);
      setUltimaSemestrale(null);
      return;
    }
    startTransition(async () => {
      const res = await getUltimeManutenzioniPerImpianto(selectedImpiantoId);
      if (res?.success) {
        setUltimaManutenzione(res.ultimaManutenzione || null);
        setUltimaSemestrale(res.ultimaSemestrale || null);
      } else {
        setUltimaManutenzione(null);
        setUltimaSemestrale(null);
      }
    });
  }, [selectedImpiantoId]);

  // Carica le firme esistenti (solo base64; all'import da CSV le URL vengono convertite in base64)
  useEffect(() => {
    if (defaultValues?.firmaTecnico && defaultValues.firmaTecnico.startsWith("data:image") && firmaTecnicoRef.current) {
      firmaTecnicoRef.current.fromDataURL(defaultValues.firmaTecnico);
    }
    if (defaultValues?.firmaCliente && defaultValues.firmaCliente.startsWith("data:image") && firmaClienteRef.current) {
      firmaClienteRef.current.fromDataURL(defaultValues.firmaCliente);
    }
  }, [defaultValues]);

  const handleClearSignature = (ref: React.RefObject<SignatureCanvas | null>, fieldName: "firmaTecnico" | "firmaCliente") => {
    ref.current?.clear();
    form.setValue(fieldName, "");
  };

  const handleEndSignature = (ref: React.RefObject<SignatureCanvas | null>, fieldName: "firmaTecnico" | "firmaCliente") => {
    if (ref.current && !ref.current.isEmpty()) {
      form.setValue(fieldName, ref.current.toDataURL("image/png"));
    }
  };

  async function onSubmit(data: ManutenzioneFormValues) {
    setLoading(true);

    if (firmaTecnicoRef.current && !firmaTecnicoRef.current.isEmpty()) {
      data.firmaTecnico = firmaTecnicoRef.current.toDataURL("image/png");
    } else if (firmaTecnicoRef.current?.isEmpty()) {
      data.firmaTecnico = "";
    }

    if (firmaClienteRef.current && !firmaClienteRef.current.isEmpty()) {
      data.firmaCliente = firmaClienteRef.current.toDataURL("image/png");
    } else if (firmaClienteRef.current?.isEmpty()) {
      data.firmaCliente = "";
    }

    if (!isOnline) {
      await addToQueue("manutenzione", data as Record<string, unknown>);
      setLoading(false);
      onSuccess();
      alert("Salvato in locale. Verrà sincronizzato quando la rete tornerà disponibile.");
      return;
    }

    const res = await saveManutenzione(data);
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
        
        {availableImpianti.length === 0 && !defaultValues && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 font-medium">
            Attenzione: Non ci sono impianti che necessitano di manutenzione al momento.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="impiantoId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Impianto <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={availableImpianti.map((impianto) => ({
                      value: impianto.id,
                      label: `${impianto.numeroImpianto ?? ""}`,
                      description: `${impianto.indirizzo}, ${impianto.comune}`,
                    }))}
                    placeholder="Seleziona l'impianto da manutenere"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedImpiantoId && (ultimaManutenzione || ultimaSemestrale) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ultima manutenzione
              </p>
              {ultimaManutenzione ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(
                      ultimaManutenzione.dataManutenzione
                    ).toLocaleDateString("it-IT")}
                    {ultimaManutenzione.oraEsecuzione
                      ? ` — ${ultimaManutenzione.oraEsecuzione}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Tecnico: {ultimaManutenzione.tecnico?.name || "-"}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Nessuna manutenzione registrata.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ultima semestrale
              </p>
              {ultimaSemestrale ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(
                      ultimaSemestrale.dataManutenzione
                    ).toLocaleDateString("it-IT")}
                    {ultimaSemestrale.oraEsecuzione
                      ? ` — ${ultimaSemestrale.oraEsecuzione}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Tecnico: {ultimaSemestrale.tecnico?.name || "-"}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Nessuna semestrale registrata.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <FormField
            control={form.control}
            name="dataManutenzione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Manutenzione <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tecnicoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tecnico <span className="text-red-500">*</span></FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isTecnico}
                >
                  <FormControl>
                    <SelectTrigger className={isTecnico ? "bg-slate-100" : ""}>
                      <SelectValue placeholder="Seleziona tecnico">
                        {field.value &&
                          tecnici.find((t) => t.id === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tecnici.map((tecnico) => (
                      <SelectItem key={tecnico.id} value={tecnico.id}>
                        {tecnico.name}
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
            name="clienteFirmatario"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Cliente Firmatario (Nome e Cognome) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Es: Mario Rossi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Note intervento</FormLabel>
                <FormControl>
                  <Textarea placeholder="Eventuali note sull'intervento..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              Effettua Semestrale
            </span>
            <span className="text-xs text-slate-500">
              Abilita i controlli semestrali sull&apos;impianto
            </span>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-slate-900"
            checked={!!effettuaSemestrale}
            onChange={(e) => form.setValue("effettuaSemestrale", e.target.checked)}
          />
        </div>

        {effettuaSemestrale && (
          <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="efficienzaParacadute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficienza paracadute</FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(true)}
                      >
                        Sì
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(false)}
                      >
                        No
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="efficienzaLimitatoreVelocita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficienza limitatore di velocità</FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(true)}
                      >
                        Sì
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(false)}
                      >
                        No
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="efficienzaDispositiviSicurezza"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficienza dei dispositivi di sicurezza</FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(true)}
                      >
                        Sì
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(false)}
                      >
                        No
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condizioneFuni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condizione delle funi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condizioniAttacchiFuni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condizioni degli attacchi funi</FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === "Buoni" ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange("Buoni")}
                      >
                        Buoni
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === "Precari" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => field.onChange("Precari")}
                      >
                        Precari
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condizioneIsolamentoImpianto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Condizione dell&apos;isolamento dell&apos;impianto
                      elettrico (&gt;2000 Ω/V con minimo di 250 kΩ)
                    </FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === "Buono" ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange("Buono")}
                      >
                        Buono
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === "Scarso" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => field.onChange("Scarso")}
                      >
                        Scarso
                      </Button>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="efficienzaCollegamentiTerra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficienza dei collegamenti con la terra</FormLabel>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant={field.value === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(true)}
                      >
                        Sì
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(false)}
                      >
                        No
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="osservazioniSemestrale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Osservazioni</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Osservazioni sui controlli semestrali..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Signature Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Firma Tecnico */}
          <div className="flex flex-col gap-2">
            <FormLabel className="text-slate-700">Firma Tecnico <span className="text-red-500">*</span></FormLabel>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-[200px] relative">
              <SignatureCanvas 
                ref={firmaTecnicoRef} 
                penColor="black"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }} 
                onEnd={() => handleEndSignature(firmaTecnicoRef, "firmaTecnico")}
              />
            </div>
            <div className="flex justify-end mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => handleClearSignature(firmaTecnicoRef, "firmaTecnico")} className="text-xs h-8">
                Cancella Firma
              </Button>
            </div>
            <p className="text-xs text-slate-500">Firmare all'interno del riquadro</p>
          </div>

          {/* Firma Cliente */}
          <div className="flex flex-col gap-2">
            <FormLabel className="text-slate-700">Firma Cliente Firmatario <span className="text-red-500">*</span></FormLabel>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-[200px] relative">
              <SignatureCanvas 
                ref={firmaClienteRef} 
                penColor="black"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }} 
                onEnd={() => handleEndSignature(firmaClienteRef, "firmaCliente")}
              />
            </div>
            <div className="flex justify-end mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => handleClearSignature(firmaClienteRef, "firmaCliente")} className="text-xs h-8">
                Cancella Firma
              </Button>
            </div>
            <p className="text-xs text-slate-500">Far firmare il cliente all'interno del riquadro</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : "SALVA MANUTENZIONE"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

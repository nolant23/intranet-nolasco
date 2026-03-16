"use client";

import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { createVerificaBiennale, updateVerificaBiennale } from "../actions";
import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useOffline } from "@/contexts/OfflineContext";

const ENTE_OPTIONS = [
  "CENPI",
  "EUROCERT",
  "EC",
  "IGM",
  "IMQ",
  "E.L.T.I.",
  "SICURCERT",
  "OCE",
  "ECOS ITALIA",
  "ASP",
] as const;

const verificaBiennaleSchema = z.object({
  dataVerifica: z.string().min(1, "Obbligatorio"),
  impiantoId: z.string().min(1, "Impianto obbligatorio"),
  enteNotificato: z.string().optional().nullable(),
  tecnicoId: z.string().min(1, "Tecnico obbligatorio"),
  clienteFirmatario: z.string().optional().nullable(),
  ingegnere: z.string().optional().nullable(),
  prescrizioni: z.string().optional().nullable(),
  firmaCliente: z.string().optional().nullable(),
});

type VerificaBiennaleFormValues = z.infer<typeof verificaBiennaleSchema>;

interface VerificaBiennaleFormProps {
  defaultValues?: any;
  verificaId?: string;
  impianti: any[];
  tecnici: any[];
  currentUser: any;
  onSuccess: () => void;
}

export function VerificaBiennaleForm({
  defaultValues,
  verificaId,
  impianti,
  tecnici,
  currentUser,
  onSuccess,
}: VerificaBiennaleFormProps) {
  const [loading, setLoading] = useState(false);
  const [verbaleFileName, setVerbaleFileName] = useState<string>("");
  const firmaClienteRef = useRef<SignatureCanvas>(null);
  const { isOnline, addToQueue } = useOffline();

  const isTecnico = currentUser?.role === "TECNICO";
  const defaultTecnicoId = isTecnico ? currentUser.id : "";

  const form = useForm<VerificaBiennaleFormValues>({
    resolver: zodResolver(verificaBiennaleSchema),
    defaultValues: defaultValues
      ? {
          dataVerifica: new Date(defaultValues.dataVerifica).toISOString().split("T")[0],
          impiantoId: defaultValues.impiantoId ?? "",
          enteNotificato: defaultValues.enteNotificato ?? "",
          tecnicoId: defaultValues.tecnicoId ?? "",
          clienteFirmatario: defaultValues.clienteFirmatario ?? "",
          ingegnere: defaultValues.ingegnere ?? "",
          prescrizioni: defaultValues.prescrizioni ?? "",
          firmaCliente: defaultValues.firmaCliente ?? "",
        }
      : {
          dataVerifica: new Date().toISOString().split("T")[0],
          impiantoId: "",
          enteNotificato: "",
          tecnicoId: defaultTecnicoId,
          clienteFirmatario: "",
          ingegnere: "",
          prescrizioni: "",
          firmaCliente: "",
        },
  });

  useEffect(() => {
    if (defaultValues?.firmaCliente && defaultValues.firmaCliente.startsWith("data:image") && firmaClienteRef.current) {
      firmaClienteRef.current.fromDataURL(defaultValues.firmaCliente);
    }
  }, [defaultValues]);

  const handleClearSignature = () => {
    firmaClienteRef.current?.clear();
    form.setValue("firmaCliente", "");
  };

  const handleEndSignature = () => {
    if (firmaClienteRef.current && !firmaClienteRef.current.isEmpty()) {
      form.setValue("firmaCliente", firmaClienteRef.current.toDataURL("image/png"));
    } else if (firmaClienteRef.current?.isEmpty()) {
      form.setValue("firmaCliente", "");
    }
  };

  const verbaleFileRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (data: VerificaBiennaleFormValues) => {
    const firmaCliente =
      firmaClienteRef.current && !firmaClienteRef.current.isEmpty()
        ? firmaClienteRef.current.toDataURL("image/png")
        : "";
    setLoading(true);
    try {
      if (!isOnline) {
        const payload: Record<string, unknown> = {
          dataVerifica: data.dataVerifica,
          impiantoId: data.impiantoId,
          tecnicoId: data.tecnicoId,
          enteNotificato: data.enteNotificato ?? "",
          clienteFirmatario: data.clienteFirmatario ?? "",
          ingegnere: data.ingegnere ?? "",
          prescrizioni: data.prescrizioni ?? "",
          firmaCliente,
        };
        if (verificaId) payload.verificaId = verificaId;
        const file = verbaleFileRef.current?.files?.[0];
        if (file && file.size > 0) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              if (result.startsWith("data:")) resolve(result.split(",")[1] ?? "");
              else resolve("");
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          payload.verbaleFileBase64 = base64;
          payload.verbaleFileName = file.name;
          payload.verbaleFileType = file.type || "application/pdf";
        }
        await addToQueue("verifica_biennale", payload);
        setLoading(false);
        onSuccess();
        alert("Salvato in locale. Verrà sincronizzato quando la rete tornerà disponibile.");
        return;
      }

      const formData = new FormData();
      formData.set("dataVerifica", data.dataVerifica);
      formData.set("impiantoId", data.impiantoId);
      formData.set("tecnicoId", data.tecnicoId);
      formData.set("enteNotificato", data.enteNotificato ?? "");
      formData.set("clienteFirmatario", data.clienteFirmatario ?? "");
      formData.set("ingegnere", data.ingegnere ?? "");
      formData.set("prescrizioni", data.prescrizioni ?? "");
      formData.set("firmaCliente", firmaCliente);
      const file = verbaleFileRef.current?.files?.[0];
      if (file && file.size > 0) formData.set("verbaleFile", file);
      const res = verificaId
        ? await updateVerificaBiennale(verificaId, formData)
        : await createVerificaBiennale(formData);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Errore durante il salvataggio");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Impianto: colonna intera */}
          <FormField
            control={form.control}
            name="impiantoId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Impianto</FormLabel>
                <FormControl>
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={impianti.map((impianto) => ({
                      value: impianto.id,
                      label: String(impianto.numeroImpianto || "-"),
                      description: `${impianto.indirizzo}, ${impianto.comune}`,
                    }))}
                    placeholder="Cerca impianto..."
                    noResultsLabel="Nessun impianto trovato"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Data e Tecnico vicini */}
          <FormField
            control={form.control}
            name="dataVerifica"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data verifica</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-white" />
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
                <FormLabel>Tecnico</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isTecnico}
                >
                  <FormControl>
                    <SelectTrigger className={isTecnico ? "bg-slate-100" : "bg-white"}>
                      <SelectValue placeholder="Seleziona tecnico">
                        {field.value ? (tecnici.find((t) => t.id === field.value)?.name ?? "Tecnico") : null}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tecnici.map((tecnico) => (
                      <SelectItem key={tecnico.id} value={tecnico.id}>
                        {tecnico.name ?? tecnico.email ?? tecnico.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Ente notificato e Ingegnere vicini */}
          <FormField
            control={form.control}
            name="enteNotificato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ente notificato</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Seleziona ente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ENTE_OPTIONS.map((ente) => (
                      <SelectItem key={ente} value={ente}>
                        {ente}
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
            name="ingegnere"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingegnere</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} className="bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Resto campi: colonna intera */}
          <FormItem className="md:col-span-2">
            <FormLabel>Allegato verbale (foto o PDF)</FormLabel>
            <div className="space-y-2">
              <div className="flex h-10 min-h-10 items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                <input
                  ref={verbaleFileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(e) => setVerbaleFileName(e.target.files?.[0]?.name ?? "")}
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                  id="verbale-file-input"
                />
                <label
                  htmlFor="verbale-file-input"
                  className="flex h-8 items-center justify-center px-4 rounded-l-md border-r border-slate-300 bg-slate-100 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 shrink-0"
                >
                  Scegli file
                </label>
                <span className="flex items-center px-3 text-sm text-slate-500 min-w-0 truncate">
                  {verbaleFileName || "Nessun file selezionato"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Puoi allegare una foto (anche scattata dalla fotocamera), oppure un file PDF.
              </p>
            </div>
          </FormItem>
          <FormField
            control={form.control}
            name="prescrizioni"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Prescrizioni</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={3} className="bg-white resize-none" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="clienteFirmatario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente firmatario</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} className="bg-white" placeholder="Nome del firmatario" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            <FormLabel className="text-slate-700">Firma cliente</FormLabel>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-[200px] relative">
            <SignatureCanvas
              ref={firmaClienteRef}
              penColor="black"
              canvasProps={{ className: "w-full h-full cursor-crosshair" }}
              onEnd={handleEndSignature}
            />
          </div>
          <div className="flex justify-end mt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleClearSignature} className="text-xs h-8">
              Cancella firma
            </Button>
          </div>
          <p className="text-xs text-slate-500">Far firmare il cliente all&apos;interno del riquadro</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : verificaId ? "AGGIORNA VERIFICA" : "SALVA VERIFICA"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

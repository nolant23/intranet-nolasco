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
import { saveIntervento } from "../actions";
import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Trash2, Upload } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { useOffline } from "@/contexts/OfflineContext";

const interventoSchema = z.object({
  id: z.string().optional(),
  dataIntervento: z.string().min(1, "Obbligatorio"),
  oraInizio: z.string().min(1, "Obbligatorio"),
  oraFine: z.string().min(1, "Obbligatorio"),
  tecnicoId: z.string().min(1, "Obbligatorio"),
  impiantoId: z.string().min(1, "Obbligatorio"),
  descrizione: z.string().optional().nullable(),
  partiSostituite: z.string().optional().nullable(),
  materialeOrdinare: z.string().optional().nullable(),
  clienteFirmatario: z.string().min(2, "Obbligatorio"),
  firmaTecnico: z.string().optional().nullable(),
  firmaCliente: z.string().optional().nullable(),
});

type InterventoFormValues = z.infer<typeof interventoSchema>;

interface InterventoFormProps {
  defaultValues?: any;
  impianti: any[];
  tecnici: any[];
  currentUser: any;
  onSuccess: () => void;
}

export function InterventoForm({ defaultValues, impianti, tecnici, currentUser, onSuccess }: InterventoFormProps) {
  const [loading, setLoading] = useState(false);
  const firmaTecnicoRef = useRef<SignatureCanvas>(null);
  const firmaClienteRef = useRef<SignatureCanvas>(null);
  const { isOnline, addToQueue } = useOffline();

  // Foto handler
  const [fotoList, setFotoList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTecnico = currentUser?.role === "TECNICO";
  const defaultTecnicoId = isTecnico ? currentUser.id : "";

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const form = useForm<InterventoFormValues>({
    resolver: zodResolver(interventoSchema),
    defaultValues: defaultValues ? {
      id: defaultValues.id,
      dataIntervento: new Date(defaultValues.dataIntervento).toISOString().split('T')[0],
      oraInizio: defaultValues.oraInizio,
      oraFine: defaultValues.oraFine,
      tecnicoId: defaultValues.tecnicoId,
      impiantoId: defaultValues.impiantoId,
      descrizione: defaultValues.descrizione || "",
      partiSostituite: defaultValues.partiSostituite || "",
      materialeOrdinare: defaultValues.materialeOrdinare || "",
      clienteFirmatario: defaultValues.clienteFirmatario,
      firmaTecnico: defaultValues.firmaTecnico,
      firmaCliente: defaultValues.firmaCliente,
    } : {
      dataIntervento: new Date().toISOString().split('T')[0],
      oraInizio: "",
      oraFine: getCurrentTime(),
      tecnicoId: defaultTecnicoId,
      impiantoId: "",
      descrizione: "",
      partiSostituite: "",
      materialeOrdinare: "",
      clienteFirmatario: "",
      firmaTecnico: "",
      firmaCliente: "",
    },
  });

  const oraInizioValue = form.watch("oraInizio");

  useEffect(() => {
    if (defaultValues?.firmaTecnico && firmaTecnicoRef.current) {
      firmaTecnicoRef.current.fromDataURL(defaultValues.firmaTecnico);
    }
    if (defaultValues?.firmaCliente && firmaClienteRef.current) {
      firmaClienteRef.current.fromDataURL(defaultValues.firmaCliente);
    }
    if (defaultValues?.foto) {
      try {
        const parsed = JSON.parse(defaultValues.foto);
        if (Array.isArray(parsed)) {
          setFotoList(parsed);
        }
      } catch (e) {
        // ignore
      }
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

  async function compressImageFile(
    file: File,
    maxSize = 1600,
    quality = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error("Impossibile leggere il file"));
          return;
        }
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Ridimensiona mantenendo il rapporto, lato lungo max = maxSize
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Impossibile creare il contesto canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = event.target.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const compressed: string[] = [];

    for (const file of fileArray) {
      try {
        const dataUrl = await compressImageFile(file, 1600, 0.8);
        compressed.push(dataUrl);
      } catch (err) {
        console.error("Errore compressione immagine intervento:", err);
      }
    }

    if (compressed.length) {
      setFotoList((prev) => [...prev, ...compressed]);
    }
  };

  const removeFoto = (index: number) => {
    setFotoList(prev => prev.filter((_, i) => i !== index));
  };

  async function onSubmit(data: InterventoFormValues) {
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

    const payload = {
      ...data,
      // Inviamo una singola stringa JSON invece di un grande array,
      // per evitare problemi di serializzazione/nesting nelle Server Actions
      foto: JSON.stringify(fotoList),
    };

    if (!isOnline) {
      await addToQueue("intervento", payload as Record<string, unknown>);
      setLoading(false);
      onSuccess();
      alert("Salvato in locale. Verrà sincronizzato quando la rete tornerà disponibile.");
      return;
    }

    const res = await saveIntervento(payload);
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
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

          <FormField
            control={form.control}
            name="tecnicoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tecnico</FormLabel>
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
            name="dataIntervento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Intervento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="oraInizio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <span>Ora di inizio</span>
                  <span className="text-red-600 font-black">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    placeholder="Inserisci ora inizio"
                    className={cn(
                      !oraInizioValue
                        ? "border-red-300 focus-visible:ring-red-500/30 bg-red-50/30"
                        : ""
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="oraFine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ora di fine</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descrizione"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrizione Intervento</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descrivi il problema o l'intervento effettuato..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partiSostituite"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Parti installate o sostituite</FormLabel>
                <FormControl>
                  <Textarea placeholder="Elenca eventuali componenti sostituiti..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="materialeOrdinare"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Materiale da ordinare</FormLabel>
                <FormControl>
                  <Textarea placeholder="Elenca eventuali componenti necessari..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Area Foto */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <FormLabel>Foto allegate</FormLabel>
            <div className="flex flex-wrap gap-4">
              {fotoList.map((foto, idx) => (
                <div key={idx} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeFoto(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer bg-white"
              >
                <Upload className="h-6 w-6 mb-1" />
                <span className="text-xs font-semibold uppercase tracking-wider text-center px-2">Aggiungi<br/>Foto</span>
              </button>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
            </div>
            <p className="text-xs text-slate-500">Puoi scattare foto o sceglierle dalla galleria (anche multiple).</p>
          </div>

          <FormField
            control={form.control}
            name="clienteFirmatario"
            render={({ field }) => (
              <FormItem className="md:col-span-2 mt-4">
                <FormLabel>Cliente Firmatario (Nome e Cognome)</FormLabel>
                <FormControl>
                  <Input placeholder="Es: Mario Rossi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Firma Tecnico */}
          <div className="flex flex-col gap-2">
            <FormLabel className="text-slate-700">Firma Tecnico</FormLabel>
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
            <FormLabel className="text-slate-700">Firma Cliente Firmatario</FormLabel>
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
            {loading ? "SALVATAGGIO..." : "SALVA INTERVENTO"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

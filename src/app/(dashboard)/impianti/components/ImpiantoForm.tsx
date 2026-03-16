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
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { saveImpianto } from "../actions";
import { useState } from "react";

const AZIONAMENTO_OPTIONS = ["Elettrico", "Oleodinamico"] as const;

const impiantoSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Seleziona un cliente"),
  amministratoreId: z.string().optional().or(z.literal("")),
  numeroImpianto: z.string().optional(),
  indirizzo: z.string().min(2, "Obbligatorio"),
  comune: z.string().min(2, "Obbligatorio"),
  cap: z.string().min(5, "Obbligatorio"),
  provincia: z.string().min(2, "Obbligatorio"),
  enteNotificato: z.string().optional(),
  tipologia: z.string().optional(),
  azionamento: z.string().optional().nullable(),
  numeroFabbrica: z.string().optional(),
  matricola: z.string().optional(),
});

type FormValues = z.infer<typeof impiantoSchema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  clienti: any[];
  amministratori: any[];
  onSuccess: () => void;
}

export function ImpiantoForm({ defaultValues, clienti, amministratori, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(impiantoSchema),
    defaultValues: defaultValues || {
      clienteId: "",
      amministratoreId: "",
      numeroImpianto: "",
      indirizzo: "",
      comune: "",
      cap: "",
      provincia: "",
      enteNotificato: "",
      tipologia: "",
      azionamento: "",
      numeroFabbrica: "",
      matricola: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    // clean up nulls/empty strings for optional relations
    const submissionData = { ...data };
    if (!submissionData.amministratoreId) {
      submissionData.amministratoreId = undefined as any;
    }
    
    const res = await saveImpianto(submissionData);
    setLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente Collegato</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona...">
                        {field.value
                          ? clienti.find((c) => c.id === field.value)?.denominazione
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clienti.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.denominazione}
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
            name="amministratoreId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amministratore (Opzionale)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona...">
                        {field.value && field.value.trim() !== ""
                          ? amministratori.find((a) => a.id === field.value)
                              ?.denominazione
                          : "Nessuno"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value=" ">Nessuno</SelectItem>
                    {amministratori.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.denominazione}
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
            name="numeroImpianto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Impianto</FormLabel>
                <FormControl>
                  <Input placeholder="Es. 12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipologia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia Impianto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ascensore">Ascensore</SelectItem>
                    <SelectItem value="Piattaforma Elevatrice">Piattaforma Elevatrice</SelectItem>
                    <SelectItem value="Montavivande">Montavivande</SelectItem>
                    <SelectItem value="Montascale">Montascale</SelectItem>
                    <SelectItem value="Vimec">Vimec</SelectItem>
                    <SelectItem value="Servoscala a pedana">Servoscala a pedana</SelectItem>
                    <SelectItem value="Montalettighe">Montalettighe</SelectItem>
                    <SelectItem value="Montacarichi">Montacarichi</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="azionamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Azionamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AZIONAMENTO_OPTIONS.map((opt) => (
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
            name="indirizzo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo Impianto</FormLabel>
                <FormControl>
                  <Input placeholder="Via e civico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comune"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comune</FormLabel>
                <ComuneAutocomplete
                  value={field.value}
                  onSelectData={(comune, cap, provincia) => {
                    form.setValue("comune", comune);
                    form.setValue("cap", cap);
                    form.setValue("provincia", provincia);
                  }}
                  error={!!form.formState.errors.comune}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cap"
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

          <FormField
            control={form.control}
            name="provincia"
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
            name="enteNotificato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ente Notificato</FormLabel>
                <FormControl>
                  <Input placeholder="Es. IMQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numeroFabbrica"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero di Fabbrica</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matricola"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matricola</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : "SALVA IMPIANTO"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

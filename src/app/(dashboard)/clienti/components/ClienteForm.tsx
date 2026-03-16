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
import { saveCliente } from "../actions";
import { useState } from "react";

const clienteSchema = z.object({
  id: z.string().optional(),
  denominazione: z.string().min(2, "Obbligatorio"),
  indirizzo: z.string().min(2, "Obbligatorio"),
  comune: z.string().min(2, "Obbligatorio"),
  cap: z.string().min(5, "Obbligatorio"),
  provincia: z.string().min(2, "Obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  pec: z.string().email("PEC non valida").optional().or(z.literal("")),
  codiceSdi: z.string().optional(),
  cellulare: z.string().optional(),
  glideId: z.string().optional(),
  ficId: z.string().optional(),
  tipologia: z.string().min(2, "Seleziona una tipologia"),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  defaultValues?: Partial<ClienteFormValues>;
  onSuccess: () => void;
}

export function ClienteForm({ defaultValues, onSuccess }: ClienteFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: defaultValues || {
      denominazione: "",
      indirizzo: "",
      comune: "",
      cap: "",
      provincia: "",
      email: "",
      pec: "",
      codiceSdi: "",
      cellulare: "",
      glideId: "",
      ficId: "",
      tipologia: "",
    },
  });

  async function onSubmit(data: ClienteFormValues) {
    setLoading(true);
    const res = await saveCliente(data);
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
            name="denominazione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Denominazione</FormLabel>
                <FormControl>
                  <Input placeholder="Nome o Ragione Sociale" {...field} />
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
                <FormLabel>Tipologia Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Persona Fisica">Persona Fisica</SelectItem>
                    <SelectItem value="Azienda">Azienda</SelectItem>
                    <SelectItem value="Condominio">Condominio</SelectItem>
                    <SelectItem value="PA">Pubblica Amministrazione (PA)</SelectItem>
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
                <FormLabel>Indirizzo</FormLabel>
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@esempio.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PEC</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="pec@pec.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codiceSdi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice SDI</FormLabel>
                <FormControl>
                  <Input placeholder="Es: M5UXCR1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cellulare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cellulare</FormLabel>
                <FormControl>
                  <Input placeholder="Es: 3331234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="glideId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Glide</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ficId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID FiC</FormLabel>
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
            {loading ? "SALVATAGGIO..." : "SALVA CLIENTE"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

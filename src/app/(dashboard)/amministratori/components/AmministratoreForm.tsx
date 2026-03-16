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
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { saveAmministratore } from "../actions";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const amministratoreSchema = z.object({
  id: z.string().optional(),
  denominazione: z.string().min(2, "Obbligatorio"),
  indirizzo: z.string().min(2, "Obbligatorio"),
  comune: z.string().min(2, "Obbligatorio"),
  cap: z.string().min(5, "Obbligatorio"),
  provincia: z.string().min(2, "Obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  pec: z.string().email("PEC non valida").optional().or(z.literal("")),
  telefono: z.string().optional(),
  cellulare: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof amministratoreSchema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  onSuccess: () => void;
}

export function AmministratoreForm({ defaultValues, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(amministratoreSchema),
    defaultValues: defaultValues || {
      denominazione: "",
      indirizzo: "",
      comune: "",
      cap: "",
      provincia: "",
      email: "",
      pec: "",
      telefono: "",
      cellulare: "",
      note: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    const res = await saveAmministratore(data);
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
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono Fisso</FormLabel>
                <FormControl>
                  <Input placeholder="Es: 091123456" {...field} />
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
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea placeholder="Note aggiuntive..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-6">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : "SALVA AMMINISTRATORE"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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
import { saveUtente } from "../actions";
import { useState } from "react";

const utenteSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Obbligatorio"),
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
  role: z.string().min(2, "Seleziona un ruolo"),
  attivo: z.boolean().optional(),
});

type UtenteFormValues = z.infer<typeof utenteSchema>;

interface UtenteFormProps {
  defaultValues?: Partial<UtenteFormValues>;
  onSuccess: () => void;
}

export function UtenteForm({ defaultValues, onSuccess }: UtenteFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<UtenteFormValues>({
    resolver: zodResolver(utenteSchema),
    defaultValues: defaultValues || {
      name: "",
      email: "",
      password: "",
      role: "",
      attivo: true,
    },
  });

  async function onSubmit(data: UtenteFormValues) {
    setLoading(true);
    const res = await saveUtente(data);
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome e Cognome</FormLabel>
                <FormControl>
                  <Input placeholder="Es: Mario Rossi" {...field} />
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
                  <Input type="email" placeholder="mario.rossi@esempio.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Inserisci password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ruolo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="UFFICIO">Ufficio</SelectItem>
                    <SelectItem value="TECNICO">Tecnico</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="attivo"
          render={({ field }) => (
            <FormItem className="mt-2">
              <FormLabel>Stato utente</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      field.value ?? true
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                    onClick={() => field.onChange(true)}
                  >
                    Attivo
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      field.value === false
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                    onClick={() => field.onChange(false)}
                  >
                    Non attivo
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-6">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
            {loading ? "SALVATAGGIO..." : "SALVA UTENTE"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

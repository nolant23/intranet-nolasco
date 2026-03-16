"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPresenzaCantiere } from "../actions";
import { useState } from "react";

const schema = z.object({
  data: z.string().min(1, "Data obbligatoria"),
  oreCantiere: z.coerce.number().min(0.5, "Minimo 0.5 ore").max(24, "Massimo 24 ore"),
  descrizione: z.string().optional().nullable(),
  bookingId: z.string().min(1, "Seleziona un cantiere"),
});

type FormValues = z.infer<typeof schema>;

type BookingInCorso = { id: string; codiceImpianto: string | null; indirizzoImpianto: string | null; comuneImpianto: string | null };

type Props = {
  bookingsInCorso: BookingInCorso[];
  currentUser: { id: string; name: string; role: string };
  backHref?: string;
  onSuccessRedirect?: string;
};

export function NuovaPresenzaCantierePageClient({
  bookingsInCorso,
  currentUser,
  backHref = "/tecnici",
  onSuccessRedirect = "/tecnici",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      data: new Date().toISOString().slice(0, 10),
      oreCantiere: 8,
      descrizione: "",
      bookingId: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    try {
      await createPresenzaCantiere({
        data: values.data,
        oreCantiere: values.oreCantiere,
        descrizione: values.descrizione || null,
        bookingId: values.bookingId,
        tecnicoId: currentUser.id,
      });
      router.push(onSuccessRedirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full min-h-0">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="h-5 w-5" /> Indietro
        </Link>
      </div>
      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Nuova presenza cantiere
        </h1>
        <p className="text-slate-500 font-medium mb-6">
          Solo impianti con stato montaggio &quot;In Corso&quot;. Il tecnico registrato è <strong>{currentUser.name}</strong>.
        </p>

        {bookingsInCorso.length === 0 && (
          <p className="text-amber-700 font-medium mb-4">
            Nessun impianto con stato &quot;In Corso&quot;. Impossibile aggiungere una presenza cantiere.
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="oreCantiere"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ore cantiere</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.5} min={0.5} max={24} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SELEZIONA CANTIERE</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={bookingsInCorso.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cantiere" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bookingsInCorso.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {`${b.codiceImpianto ?? "-"} | ${b.indirizzoImpianto ?? "-"} - ${b.comuneImpianto ?? "-"}`}
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
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Descrizione attività..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading || bookingsInCorso.length === 0}
              className="font-black uppercase tracking-wider"
            >
              {loading ? "Salvataggio..." : "Salva presenza cantiere"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

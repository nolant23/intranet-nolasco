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
import { updateProfilo } from "../actions";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const profiloSchema = z.object({
 email: z.string().email("Email non valida"),
 password: z.string().optional(),
});

type ProfiloFormValues = z.infer<typeof profiloSchema>;

export function ProfiloClient({ user }: { user: any }) {
 const [loading, setLoading] = useState(false);
 const [successMsg, setSuccessMsg] = useState("");

 const form = useForm<ProfiloFormValues>({
 resolver: zodResolver(profiloSchema),
 defaultValues: {
 email: user.email,
 password: "", // Lasciamo vuota per non mostrarla, aggiorna solo se compilata
 },
 });

 async function onSubmit(data: ProfiloFormValues) {
 setLoading(true);
 setSuccessMsg("");
 const res = await updateProfilo(data);
 setLoading(false);
 
 if (res.success) {
 setSuccessMsg("Profilo aggiornato con successo!");
 form.setValue("password", ""); // Reset password field after save
 } else {
 alert(res.error);
 }
 }

 return (
 <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto p-2">
 <div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Il mio Profilo</h1>
 <p className="text-slate-500 font-medium mt-1">Modifica le tue credenziali di accesso</p>
 </div>

 <Card className="rounded-2xl border-slate-200 shadow-sm">
 <CardHeader>
 <CardTitle>Credenziali di accesso</CardTitle>
 <CardDescription>
 Account: {user.name} ({user.role})
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
 
 <FormField
 control={form.control}
 name="email"
 render={({ field }) => (
 <FormItem>
 <FormLabel>Email (Username per il login)</FormLabel>
 <FormControl>
 <Input type="email" placeholder="tua.email@esempio.it" {...field} />
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
 <FormLabel>Nuova Password</FormLabel>
 <FormControl>
 <Input type="password" placeholder="Lascia vuoto per non modificare" {...field} />
 </FormControl>
 <p className="text-[13px] text-slate-400 mt-1">
 Inserisci una nuova password solo se desideri cambiarla.
 </p>
 <FormMessage />
 </FormItem>
 )}
 />

 {successMsg && (
 <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
 {successMsg}
 </div>
 )}

 <div className="flex justify-end pt-4">
 <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto uppercase tracking-wider">
 {loading ? "SALVATAGGIO..." : "SALVA MODIFICHE"}
 </Button>
 </div>
 </form>
 </Form>
 </CardContent>
 </Card>
 </div>
 );
}

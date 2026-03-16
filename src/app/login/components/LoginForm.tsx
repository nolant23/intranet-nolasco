"use client";

import { useState } from "react";
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
import { loginUser } from "../actions";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setError(null);
    
    const res = await loginUser(data.email, data.password);
    
    if (!res.success) {
      setError(res.error || "Errore durante il login");
      setLoading(false);
    }
    // Se ha successo, loginUser farà un redirect alla home
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tua.email@esempio.it" className="h-12 text-lg" {...field} />
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
              <FormLabel className="text-slate-700">Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className="h-12 text-lg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading} 
          size="lg" 
          className="w-full h-12 text-lg uppercase tracking-wider font-bold"
        >
          {loading ? "ACCESSO IN CORSO..." : "ACCEDI"}
        </Button>
      </form>
    </Form>
  );
}

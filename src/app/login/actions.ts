"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginUser(email: string, password: string) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { success: false, error: "Supabase non configurato. Aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (vedi docs/SUPABASE_AUTH_MIGRATION.md)." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message === "Invalid login credentials" ? "Credenziali non valide" : error.message };
    }

    if (!data.session) {
      return { success: false, error: "Sessione non creata" };
    }

    // Persiste la sessione nei cookie (getSession fa sì che il client aggiorni i cookie)
    await supabase.auth.getSession();
  } catch (error) {
    console.error("Errore login:", error);
    return { success: false, error: "Errore di sistema" };
  }

  redirect("/");
}

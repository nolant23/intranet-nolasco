import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Restituisce l'utente corrente dalla sessione Supabase.
 * Nessuna query al DB: dati da JWT (app_metadata.role, app_metadata.prisma_user_id, user_metadata.name).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const appMetadata = user.app_metadata as Record<string, unknown> | undefined;
    const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
    const role = (appMetadata?.role as string) ?? "TECNICO";
    const prismaUserId = appMetadata?.prisma_user_id as string | undefined;

    return {
      id: prismaUserId ?? user.id,
      name: (userMetadata?.name as string) ?? user.email ?? "",
      email: user.email ?? "",
      role,
    };
  } catch (error) {
    // Durante la build Next.js può chiamare le pagine senza cookie (static analysis): non loggare come errore
    const msg = error instanceof Error ? error.message : String(error);
    const isDynamicUsage = msg.includes("cookies") || (error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE";
    if (!isDynamicUsage) {
      console.error("Errore recupero utente loggato:", error);
    }
    return null;
  }
}

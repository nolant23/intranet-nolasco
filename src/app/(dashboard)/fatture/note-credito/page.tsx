import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getNoteCredito } from "./actions";
import { NoteCreditoClient } from "./components/NoteCreditoClient";

export default async function NoteCreditoPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;

  if (!modulePerms?.READ) {
    redirect("/");
  }

  // Mostriamo tutte le note di credito presenti (dal 2025 in poi vengono sincronizzate)
  const noteCredito = await getNoteCredito();

  return (
    <NoteCreditoClient 
      initialNoteCredito={noteCredito}
      permissions={modulePerms} 
    />
  );
}

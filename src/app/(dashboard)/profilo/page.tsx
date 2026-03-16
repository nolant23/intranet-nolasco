import { getCurrentUser } from "@/lib/auth";
import { ProfiloClient } from "./components/ProfiloClient";

export default async function ProfiloPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <div className="p-8">Nessun utente loggato.</div>;
  }

  return <ProfiloClient user={user} />;
}

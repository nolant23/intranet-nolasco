import { ImpostazioniClient } from "./components/ImpostazioniClient";
import { getPermissions } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ImpostazioniPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  const permissions = await getPermissions();

  return <ImpostazioniClient initialPermissions={permissions} />;
}

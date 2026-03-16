import { getImpiantiDaManutenere } from "../manutenzioni/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { GiroClient } from "./components/GiroClient";

export default async function GiroPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const permissions = await getPermissionsForRole(currentUser.role);
  const modulePerms = permissions["Manutenzioni"];

  if (!modulePerms?.READ) {
    redirect("/");
  }

  const impiantiDaManutenere = await getImpiantiDaManutenere();

  return (
    <GiroClient
      impiantiDaManutenere={impiantiDaManutenere}
      permissions={modulePerms}
    />
  );
}


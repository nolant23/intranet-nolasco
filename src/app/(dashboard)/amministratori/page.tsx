import { getAmministratori } from "./actions";
import { AmministratoriClient } from "./components/AmministratoriClient";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AmministratoriPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions["Amministratori"];

  if (!modulePerms?.READ) {
    redirect("/");
  }

  const amministratori = await getAmministratori();

  return <AmministratoriClient amministratori={amministratori} permissions={modulePerms} />;
}

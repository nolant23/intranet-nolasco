import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getNotaCreditoById } from "../actions";
import { FatturaNoteCreditoDetailPageClient } from "./FatturaNoteCreditoDetailPageClient";

export default async function NotaCreditoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  const modulePerms = permissions?.Fatture;
  if (!modulePerms?.READ) redirect("/");

  const { id } = await params;
  const res = await getNotaCreditoById(id);
  if (!res?.success || !(res as any).data) {
    redirect("/fatture/note-credito");
  }

  const nota = (res as any).data;

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <FatturaNoteCreditoDetailPageClient nota={nota} permissionsFatture={modulePerms} />
    </div>
  );
}

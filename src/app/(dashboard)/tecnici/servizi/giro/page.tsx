import dynamic from "next/dynamic";
import { getImpiantiDaManutenere } from "@/app/(dashboard)/manutenzioni/actions";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

const GiroClient = dynamic(
  () => import("@/app/(dashboard)/giro/components/GiroClient").then((m) => m.GiroClient),
  { loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> }
);
const FieldComunePieChartsClient = dynamic(
  () => import("@/app/(dashboard)/field/components/FieldComunePieChartsClient").then((m) => m.FieldComunePieChartsClient),
  { loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> }
);

export default async function TecnicoGiroPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  const permissions = await getPermissionsForRole(currentUser.role);
  const modulePerms = permissions["Manutenzioni"];
  if (!modulePerms?.READ) redirect("/tecnici");

  const impiantiDaManutenere = await getImpiantiDaManutenere();

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <GiroClient impiantiDaManutenere={impiantiDaManutenere} permissions={modulePerms} />

      <div className="bg-white p-4 md:p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="mb-4">
          <div className="text-lg font-black uppercase tracking-wider text-slate-900">
            Rimanenti per Comune
          </div>
          <div className="text-sm text-slate-500 font-medium mt-1">
            Distribuzione degli impianti ancora da manutenere
          </div>
        </div>
        <FieldComunePieChartsClient impiantiDaManutenere={impiantiDaManutenere} />
      </div>
    </div>
  );
}

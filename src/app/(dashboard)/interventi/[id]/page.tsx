import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getInterventoById } from "../actions";
import { FileDown } from "lucide-react";
import { ChiudiButton } from "@/components/ChiudiButton";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";

export default async function InterventoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TECNICO") redirect("/tecnici/servizi/interventi");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Interventi?.READ) redirect("/");

  const { id } = await params;
  const res = await getInterventoById(id);
  if (!res?.success || !(res as any).data) redirect("/interventi");

  const d = (res as any).data;

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase min-w-0">
          Dettaglio Intervento
        </h1>
        <div className="flex gap-2 shrink-0">
          {d.rapportinoPdf && (
            <a href={d.rapportinoPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <FileDown className="h-4 w-4" />
              Scarica rapportino
            </a>
          )}
          <ChiudiButton listPath="/interventi" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {d.numeroRapportino && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">N° Rapportino</div>
              <div className="text-lg font-black text-slate-900 mt-1">{d.numeroRapportino}</div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</div>
            <div className="text-base font-semibold text-slate-900 mt-1">
              {d.dataIntervento ? new Date(d.dataIntervento).toLocaleDateString("it-IT") : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
            <div className="text-base font-semibold text-slate-900 mt-1">{d.tecnico?.name || "-"}</div>
          </div>
          {d.impianto && (
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
              <ImpiantoDetailDialog impiantoId={d.impianto.id} className="text-base font-semibold text-slate-900 mt-1 text-blue-600 hover:underline block">
                {d.impianto.numeroImpianto || ""} — {d.impianto.indirizzo}, {d.impianto.comune}
              </ImpiantoDetailDialog>
            </div>
          )}
          {d.descrizioneIntervento && (
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrizione</div>
              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{d.descrizioneIntervento}</div>
            </div>
          )}
          {d.clienteFirmatario && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{d.clienteFirmatario}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

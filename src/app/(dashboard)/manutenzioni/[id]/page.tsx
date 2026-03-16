import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { getManutenzioneById } from "../actions";
import { ChiudiButton } from "@/components/ChiudiButton";
import { ImpiantoDetailDialog } from "@/app/(dashboard)/impianti/components/ImpiantoDetailDialog";

export default async function ManutenzioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TECNICO") redirect("/tecnici/servizi/manutenzioni");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Manutenzioni?.READ) redirect("/");

  const { id } = await params;
  const res = await getManutenzioneById(id);
  if (!res?.success || !(res as any).data) redirect("/manutenzioni");

  const d = (res as any).data;

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="flex flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase min-w-0">
          Dettaglio Manutenzione
        </h1>
        <div className="shrink-0">
          <ChiudiButton listPath="/manutenzioni" className="bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base" />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data / Ora</div>
            <div className="text-base font-semibold text-slate-900 mt-1">
              {new Date(d.dataManutenzione).toLocaleDateString("it-IT")}
              {d.oraEsecuzione ? ` — ${d.oraEsecuzione}` : ""}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnico</div>
            <div className="text-base font-semibold text-slate-900 mt-1">{d.tecnico?.name || "-"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impianto</div>
            <div className="text-base font-semibold text-slate-900 mt-1">
              {d.impianto ? (
                <ImpiantoDetailDialog impiantoId={d.impianto.id} className="text-blue-600 hover:underline">
                  Impianto {d.impianto.numeroImpianto || ""} — {d.impianto.indirizzo}, {d.impianto.comune}
                </ImpiantoDetailDialog>
              ) : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente firmatario</div>
            <div className="text-base font-semibold text-slate-900 mt-1">{d.clienteFirmatario || "-"}</div>
          </div>
        </div>
        {d.effettuaSemestrale && (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Controlli semestrali</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {d.efficienzaParacadute != null && (
                <div>
                  <div className="text-xs text-slate-500">Efficienza paracadute</div>
                  <div className="text-sm font-medium text-slate-900">{d.efficienzaParacadute ? "Sì" : "No"}</div>
                </div>
              )}
              {d.efficienzaLimitatoreVelocita != null && (
                <div>
                  <div className="text-xs text-slate-500">Efficienza limitatore di velocità</div>
                  <div className="text-sm font-medium text-slate-900">{d.efficienzaLimitatoreVelocita ? "Sì" : "No"}</div>
                </div>
              )}
              {d.efficienzaDispositiviSicurezza != null && (
                <div>
                  <div className="text-xs text-slate-500">Efficienza dispositivi di sicurezza</div>
                  <div className="text-sm font-medium text-slate-900">{d.efficienzaDispositiviSicurezza ? "Sì" : "No"}</div>
                </div>
              )}
              {d.condizioneFuni && (
                <div>
                  <div className="text-xs text-slate-500">Condizione delle funi</div>
                  <div className="text-sm font-medium text-slate-900">{d.condizioneFuni}</div>
                </div>
              )}
              {d.condizioneIsolamentoImpianto && (
                <div>
                  <div className="text-xs text-slate-500">Condizione isolamento impianto elettrico</div>
                  <div className="text-sm font-medium text-slate-900">{d.condizioneIsolamentoImpianto}</div>
                </div>
              )}
              {d.efficienzaCollegamentiTerra != null && (
                <div>
                  <div className="text-xs text-slate-500">Efficienza collegamenti con la terra</div>
                  <div className="text-sm font-medium text-slate-900">{d.efficienzaCollegamentiTerra ? "Sì" : "No"}</div>
                </div>
              )}
              {d.condizioniAttacchiFuni && (
                <div>
                  <div className="text-xs text-slate-500">Condizioni attacchi funi</div>
                  <div className="text-sm font-medium text-slate-900">{d.condizioniAttacchiFuni}</div>
                </div>
              )}
              {d.osservazioniSemestrale && (
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-500">Osservazioni</div>
                  <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{d.osservazioniSemestrale}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {d.note && (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note</div>
            <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{d.note}</div>
          </div>
        )}
        {(d.firmaTecnico || d.firmaCliente) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {d.firmaTecnico && (
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma tecnico</div>
                <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center relative">
                  <img src={d.firmaTecnico} alt="Firma tecnico" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            )}
            {d.firmaCliente && (
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma cliente</div>
                <div className="border border-dashed border-slate-300 rounded-xl bg-white overflow-hidden h-[180px] flex items-center justify-center relative">
                  <img src={d.firmaCliente} alt="Firma cliente" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/components/table/grid-table.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  FileDigit,
  CalendarDays,
  EuroIcon,
  Info,
  Briefcase,
  Mail,
  Send,
  RefreshCcw,
  FileMinus,
} from "lucide-react";
import { formatEuro } from "@/lib/money";
import {
  updateFattura,
  sincronizzaSingolaFattura,
  inviaFatturaASdi,
  inviaFatturaViaEmail,
  getEmailRecipientPreview,
  deleteFatturaNonInviata,
} from "../actions";

const formatCurrency = (value: number) => formatEuro(value);
const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("it-IT");

export function FatturaDetailView({
  fattura: initialFattura,
  permissions,
  onClose,
  onFatturaUpdated,
  onFatturaDeleted,
  onOpenNotaCredito,
  isStandalone = false,
}: {
  fattura: any;
  permissions: any;
  onClose: () => void;
  onFatturaUpdated?: (f: any) => void;
  onFatturaDeleted?: () => void;
  onOpenNotaCredito?: (id: string) => void;
  isStandalone?: boolean;
}) {
  const [fattura, setFattura] = useState(initialFattura);
  const [isEditing, setIsEditing] = useState(false);
  const [editOggetto, setEditOggetto] = useState(initialFattura?.oggetto ?? "");
  const [editNote, setEditNote] = useState(initialFattura?.note ?? "");
  const [isSendingSdi, setIsSendingSdi] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    recipient: string;
    subject: string;
  } | null>(null);
  const [isSyncingSingle, setIsSyncingSingle] = useState(false);

  const canUpdate = permissions?.UPDATE;
  const canCreate = permissions?.CREATE;
  const canDelete = permissions?.DELETE;

  const handleSaveEdit = async () => {
    if (!fattura) return;
    const res = await updateFattura(fattura.id, {
      oggetto: editOggetto.trim() === "" ? null : editOggetto,
      note: editNote.trim() === "" ? null : editNote,
    });
    if (!res.success || !res.data) {
      alert(res?.error || "Errore durante l'aggiornamento della fattura");
      return;
    }
    setFattura(res.data);
    onFatturaUpdated?.(res.data);
    setIsEditing(false);
    alert("Fattura aggiornata con successo.");
  };

  if (!fattura) return null;

  return (
    <>
      <div
        className={
          isStandalone
            ? "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            : ""
        }
      >
        <div
          className={
            isStandalone
              ? "px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between gap-4"
              : "px-6 py-4 bg-slate-50 border-b border-slate-100"
          }
        >
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 min-w-0">
            <FileDigit className="w-5 h-5 text-blue-500 shrink-0" />
            Dettaglio Fattura: {fattura.numero}
          </h2>
          {isStandalone && (
            <div className="flex flex-row items-center gap-2 shrink-0">
              {fattura?.urlDocumento && (
                <Button
                  onClick={() => window.open(fattura.urlDocumento, "_blank")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Apri PDF
                </Button>
              )}
              <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
                Chiudi
              </Button>
            </div>
          )}
        </div>

        <div
          className={
            isStandalone
              ? "px-6 py-5 max-h-[calc(100vh-220px)] overflow-y-auto"
              : "px-6 py-5 max-h-[70vh] overflow-y-auto"
          }
        >
          <div className="space-y-6">
            {/* INTESTAZIONE */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Data Emissione
                </p>
                <p className="font-medium text-slate-800">
                  {formatDate(fattura.data)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Scadenza
                </p>
                <p className="font-medium text-slate-800">
                  {fattura.dataScadenza
                    ? formatDate(fattura.dataScadenza)
                    : "-"}
                </p>
              </div>
            </div>

            {/* Dati Cliente e Info Aggiuntive: su desktop affiancate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DETTAGLI CLIENTE */}
              <div className={!(fattura.oggetto || fattura.note || (canUpdate && isEditing)) ? "md:col-span-2" : ""}>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" /> Dati Cliente
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Denominazione</p>
                    <p className="font-bold text-slate-900">{fattura.clienteNome}</p>
                  </div>
                  {fattura.clienteIndirizzo && (
                    <div>
                      <p className="text-xs text-slate-500">Indirizzo</p>
                      <p className="text-sm text-slate-700">
                        {fattura.clienteIndirizzo}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {fattura.clientePartitaIva && (
                      <div>
                        <p className="text-xs text-slate-500">P.IVA</p>
                        <p className="text-sm text-slate-700 font-mono">
                          {fattura.clientePartitaIva}
                        </p>
                      </div>
                    )}
                    {fattura.clienteCodiceFiscale && (
                      <div>
                        <p className="text-xs text-slate-500">Cod. Fiscale</p>
                        <p className="text-sm text-slate-700 font-mono">
                          {fattura.clienteCodiceFiscale}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* OGGETTO E NOTE (Info Aggiuntive) */}
              {(fattura.oggetto || fattura.note || (canUpdate && isEditing)) && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" /> Info Aggiuntive
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    {canUpdate && isEditing ? (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Oggetto</p>
                          <input
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                            value={editOggetto}
                            onChange={(e) => setEditOggetto(e.target.value)}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Note</p>
                          <textarea
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {fattura.oggetto && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">
                              Oggetto
                            </p>
                            <p className="text-sm text-slate-700">
                              {fattura.oggetto}
                            </p>
                          </div>
                        )}
                        {fattura.note && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Note</p>
                            <div
                              className="prose prose-sm max-w-none text-slate-700 [&_*]:text-slate-700"
                              dangerouslySetInnerHTML={{
                                __html: fattura.note,
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* IMPORTI E PAGAMENTO */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                <EuroIcon className="w-4 h-4 text-slate-400" /> Dettagli Economici
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Imponibile</span>
                    <span className="font-medium text-slate-700">
                      {formatCurrency(fattura.importoNetto)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Imposte (IVA{" "}
                      {fattura.importoNetto > 0
                        ? Math.round(
                            (fattura.importoIva / fattura.importoNetto) * 100
                          )
                        : 0}
                      %)
                    </span>
                    <span className="font-medium text-slate-700">
                      {formatCurrency(fattura.importoIva)}
                    </span>
                  </div>
                  {typeof fattura.importoRA === "number" &&
                    fattura.importoRA !== 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">RA</span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(fattura.importoRA)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-700">
                      Totale
                    </span>
                    <span className="text-lg font-black text-blue-600">
                      {formatCurrency(fattura.importoTotale)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500 mb-1">
                      Stato Pagamento
                    </p>
                    {fattura.stato === "STORNATO" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Stornato
                      </span>
                    ) : fattura.stato === "PARZ. STORNATO" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300 w-fit">
                        <Clock className="w-3.5 h-3.5" /> Parz. Stornato
                      </span>
                    ) : fattura.stato === "SALDATO" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saldato
                      </span>
                    ) : fattura.stato === "PARZIALE" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 w-fit">
                        <Clock className="w-3.5 h-3.5" /> Parziale
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 w-fit">
                        <XCircle className="w-3.5 h-3.5" /> Da Saldare
                      </span>
                    )}

                    {Array.isArray(fattura.noteCredito) &&
                      fattura.noteCredito.length > 0 &&
                      (onOpenNotaCredito ? (
                        <button
                          type="button"
                          onClick={() => onOpenNotaCredito(fattura.noteCredito[0].id)}
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline underline-offset-2 text-left"
                        >
                          Vai alla nota di credito collegata
                        </button>
                      ) : (
                        <Link
                          href={`/fatture/note-credito/${fattura.noteCredito[0].id}`}
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline underline-offset-2"
                        >
                          Vai alla nota di credito collegata
                        </Link>
                      ))}

                    {!fattura.statoFatturaElettronica && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSendingSdi}
                        onClick={async () => {
                          if (!fattura?.ficId) return;
                          if (
                            !confirm(
                              "Inviare questa fattura al Sistema di Interscambio (SDI)?"
                            )
                          )
                            return;
                          try {
                            setIsSendingSdi(true);
                            const res = await inviaFatturaASdi(
                              String(fattura.ficId)
                            );
                            if (!res?.success) {
                              alert(
                                res?.error ||
                                  "Errore durante l'invio allo SDI."
                              );
                            } else {
                              alert(
                                "Fattura inviata allo SDI. Lo stato verrà aggiornato dopo qualche istante."
                              );
                              setFattura((prev: any) =>
                                prev
                                  ? {
                                      ...prev,
                                      statoFatturaElettronica: "sent",
                                    }
                                  : prev
                              );
                              onFatturaUpdated?.({
                                ...fattura,
                                statoFatturaElettronica: "sent",
                              });
                            }
                          } finally {
                            setIsSendingSdi(false);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSendingSdi ? "Invio in corso..." : "Invia allo SDI"}
                      </Button>
                    )}

                    {fattura.statoEmail !== "sent" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSendingEmail}
                        onClick={async () => {
                          if (!fattura?.id) return;
                          const prev = await getEmailRecipientPreview(
                            String(fattura.id)
                          );
                          if (!prev?.success) {
                            alert(
                              prev?.error ||
                                "Impossibile determinare il destinatario email."
                            );
                            return;
                          }
                          setEmailPreview({
                            recipient: prev.recipient_email || "",
                            subject: prev.subject || "",
                          });
                          setIsEmailConfirmOpen(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {isSendingEmail
                          ? "Invio email..."
                          : "Invia via Email"}
                      </Button>
                    )}

                    {fattura.statoEmail === "sent" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSendingEmail}
                        onClick={async () => {
                          if (!fattura?.id) return;
                          const prev = await getEmailRecipientPreview(
                            String(fattura.id)
                          );
                          if (!prev?.success) return;
                          const ok = confirm(
                            `Reinviare la fattura via email a:\n${prev.recipient_email}\n\nOggetto:\n${prev.subject}?`
                          );
                          if (!ok) return;
                          try {
                            setIsSendingEmail(true);
                            const res = await inviaFatturaViaEmail(
                              String(fattura.id),
                              true
                            );
                            if (!res?.success)
                              alert(res?.error || "Errore durante il reinvio.");
                            else alert("Email reinviata correttamente.");
                          } finally {
                            setIsSendingEmail(false);
                          }
                        }}
                        className="mt-2"
                      >
                        Reinvia Email
                      </Button>
                    )}
                  </div>
                  {fattura.metodoPagamento && (
                    <div>
                      <p className="text-xs text-slate-500">
                        Metodo di Pagamento
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {fattura.metodoPagamento}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CRONOLOGIA PAGAMENTI */}
            {fattura.pagamentiJson &&
              (() => {
                try {
                  const pagamenti = JSON.parse(fattura.pagamentiJson);
                  if (Array.isArray(pagamenti) && pagamenti.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" /> Cronologia
                          Pagamenti
                        </h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <div className="grid-table__scroll" style={{ maxHeight: "none" }} role="table">
                            <div
                              className="grid-table__head"
                              style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
                              role="row"
                            >
                              <div className="grid-table__head-cell font-semibold text-slate-700">Data Scadenza</div>
                              <div className="grid-table__head-cell font-semibold text-slate-700">Data Pagamento</div>
                              <div className="grid-table__head-cell font-semibold text-slate-700 grid-table__cell--right">Importo</div>
                              <div className="grid-table__head-cell font-semibold text-slate-700 grid-table__cell--center">Stato</div>
                            </div>
                            <div className="grid-table__body">
                              {pagamenti.map((pagamento: any, idx: number) => {
                                const amount = pagamento.amount || 0;
                                const status = pagamento.status;
                                const isPaid = status === "paid";
                                const isReversed = status === "reversed";
                                return (
                                  <div
                                    key={idx}
                                    className="grid-table__row"
                                    style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
                                    role="row"
                                  >
                                    <div className="grid-table__cell text-sm text-slate-700 font-medium">
                                      {pagamento.due_date ? formatDate(pagamento.due_date) : "-"}
                                    </div>
                                    <div className="grid-table__cell text-sm text-slate-700">
                                      {pagamento.paid_date ? formatDate(pagamento.paid_date) : "-"}
                                    </div>
                                    <div className="grid-table__cell text-sm font-bold text-slate-900 grid-table__cell--right">
                                      {formatCurrency(amount)}
                                    </div>
                                    <div className="grid-table__cell grid-table__cell--center">
                                      {isReversed ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                          Stornato
                                        </span>
                                      ) : isPaid ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800">
                                          Saldato
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800">
                                          Non Saldato
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  return null;
                }
                return null;
              })()}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(canCreate || canUpdate) && fattura?.ficId && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!fattura?.ficId) return;
                  setIsSyncingSingle(true);
                  const res = await sincronizzaSingolaFattura(String(fattura.ficId));
                  if (res?.success && res?.data) {
                    setFattura(res.data);
                    onFatturaUpdated?.(res.data);
                    alert(res?.message || "Aggiornato.");
                  } else {
                    alert(res?.error || "Errore sincronizzazione.");
                  }
                  setIsSyncingSingle(false);
                }}
                disabled={isSyncingSingle}
                className="text-slate-600 border-slate-300 hover:bg-slate-100"
              >
                <RefreshCcw
                  className={`w-4 h-4 mr-2 ${isSyncingSingle ? "animate-spin" : ""}`}
                />
                {isSyncingSingle ? "Sincronizzo..." : "Sincronizza Dati"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {canDelete && !fattura.statoFatturaElettronica && (
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (
                    !confirm(
                      "Vuoi davvero eliminare questa fattura? L'operazione è irreversibile."
                    )
                  )
                    return;
                  const res = await deleteFatturaNonInviata(fattura.id);
                  if (!res?.success) {
                    alert(res?.error || "Errore durante l'eliminazione.");
                    return;
                  }
                  onFatturaDeleted?.();
                  onClose();
                }}
              >
                <FileMinus className="w-4 h-4 mr-1.5" />
                Elimina
              </Button>
            )}
            {canUpdate &&
              (!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOggetto(fattura.oggetto ?? "");
                    setEditNote(fattura.note ?? "");
                    setIsEditing(true);
                  }}
                >
                  Modifica
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Salva
                  </Button>
                </>
              ))}
            {!isStandalone && (
              <>
                <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
                  Chiudi
                </Button>
                {fattura?.urlDocumento && (
                  <Button
                    onClick={() => window.open(fattura.urlDocumento, "_blank")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Apri PDF
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialog conferma invio email */}
      <Dialog open={isEmailConfirmOpen} onOpenChange={setIsEmailConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">
              Conferma invio email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Destinatario
              </p>
              <p className="text-sm font-bold text-slate-900 break-all">
                {emailPreview?.recipient || "—"}
              </p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
                Oggetto
              </p>
              <p className="text-sm text-slate-800 break-words">
                {emailPreview?.subject || "—"}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmailConfirmOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                disabled={isSendingEmail || !fattura?.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  if (!fattura?.id) return;
                  try {
                    setIsSendingEmail(true);
                    const res = await inviaFatturaViaEmail(String(fattura.id));
                    if (!res?.success) {
                      alert(res?.error || "Errore durante l'invio email.");
                      return;
                    }
                    alert("Email inviata correttamente.");
                    setFattura((prev: any) =>
                      prev ? { ...prev, statoEmail: "sent" } : prev
                    );
                    onFatturaUpdated?.({
                      ...fattura,
                      statoEmail: "sent",
                    });
                    setIsEmailConfirmOpen(false);
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
              >
                {isSendingEmail ? "Invio..." : "Conferma invio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

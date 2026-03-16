"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Send, User, Plus, Trash2 } from "lucide-react";
import {
  saveNotificationSettings,
  sendTestPushToUser,
  sendTestPushToAdminAndUfficio,
  createNotificationSetting,
  deleteNotificationSetting,
} from "../actions";

type Setting = {
  id: string;
  eventKey: string;
  label: string;
  sendToTecnico: boolean;
  sendToAdminUfficio: boolean;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function AdminNotificheClient({
  initialSettings,
  users,
}: {
  initialSettings: Setting[];
  users: UserOption[];
}) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [testUserId, setTestUserId] = useState<string>("");
  const [testSending, setTestSending] = useState(false);
  const [newEventKey, setNewEventKey] = useState("");
  const [newEventLabel, setNewEventLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const handleToggle = (id: string, field: "sendToTecnico" | "sendToAdminUfficio") => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: !s[field] } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await saveNotificationSettings(
      settings.map((s) => ({
        id: s.id,
        sendToTecnico: s.sendToTecnico,
        sendToAdminUfficio: s.sendToAdminUfficio,
      }))
    );
    setSaving(false);
    if (res.success) {
      setMessage({ type: "ok", text: "Impostazioni salvate." });
    } else {
      setMessage({ type: "err", text: res.error ?? "Errore salvataggio" });
    }
  };

  const handleTestToUser = async () => {
    if (!testUserId) {
      setMessage({ type: "err", text: "Seleziona un utente." });
      return;
    }
    setTestSending(true);
    setMessage(null);
    const res = await sendTestPushToUser(testUserId, { title: "Test notifica", body: "Inviata dall'admin." });
    setTestSending(false);
    if (res.success) {
      setMessage({ type: "ok", text: `Notifica inviata (${res.sent ?? 0} dispositivi).` });
    } else {
      setMessage({ type: "err", text: res.error ?? "Nessun dispositivo registrato per questo utente." });
    }
  };

  const handleTestToAdminUfficio = async () => {
    setTestSending(true);
    setMessage(null);
    const res = await sendTestPushToAdminAndUfficio();
    setTestSending(false);
    if (res.success) {
      setMessage({ type: "ok", text: `Inviata a Admin e Ufficio (${res.sent ?? 0} dispositivi).` });
    } else {
      setMessage({ type: "err", text: res.error ?? "Errore invio." });
    }
  };

  const handleAddEvent = async () => {
    if (!newEventKey.trim()) {
      setMessage({ type: "err", text: "Inserisci la chiave evento (es. verifica_biennale.created)." });
      return;
    }
    setAdding(true);
    setMessage(null);
    const res = await createNotificationSetting(newEventKey.trim(), newEventLabel.trim());
    setAdding(false);
    if (res.success && res.data) {
      setSettings((prev) => [...prev, res.data].sort((a, b) => a.eventKey.localeCompare(b.eventKey)));
      setNewEventKey("");
      setNewEventLabel("");
      setMessage({ type: "ok", text: "Evento aggiunto. Salva le impostazioni per applicare." });
    } else {
      const errMsg = !res.success ? res.error : "Errore aggiunta evento.";
      setMessage({ type: "err", text: errMsg });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Rimuovere questo evento dalle notifiche?")) return;
    setMessage(null);
    const res = await deleteNotificationSetting(id);
    if (res.success) {
      setSettings((prev) => prev.filter((s) => s.id !== id));
      setMessage({ type: "ok", text: "Evento rimosso." });
    } else {
      setMessage({ type: "err", text: res.error ?? "Errore eliminazione." });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-slate-600" />
            Eventi notifica
          </CardTitle>
          <CardDescription>
            Per ogni evento scegli se inviare la push al tecnico assegnato e/o ad Admin e Ufficio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{s.label}</span>
                <span className="text-xs text-slate-400">{s.eventKey}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => handleDeleteEvent(s.id)}
                  title="Rimuovi evento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <Switch
                    checked={s.sendToTecnico}
                    onCheckedChange={() => handleToggle(s.id, "sendToTecnico")}
                  />
                  Al tecnico assegnato
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <Switch
                    checked={s.sendToAdminUfficio}
                    onCheckedChange={() => handleToggle(s.id, "sendToAdminUfficio")}
                  />
                  Ad Admin e Ufficio
                </label>
              </div>
            </div>
          ))}
          <div className="pt-4 flex flex-wrap items-end gap-3 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Nuovo evento (chiave)</label>
              <input
                type="text"
                placeholder="es. verifica_biennale.created"
                value={newEventKey}
                onChange={(e) => setNewEventKey(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Etichetta</label>
              <input
                type="text"
                placeholder="es. Verifica biennale"
                value={newEventLabel}
                onChange={(e) => setNewEventLabel(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleAddEvent} disabled={adding}>
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi evento
            </Button>
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva impostazioni"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-slate-600" />
            Invia notifica di test
          </CardTitle>
          <CardDescription>
            Invia una notifica di test a un utente o a tutti gli Admin e Ufficio (solo a chi ha abilitato le notifiche).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-[200px]">
              <User className="h-4 w-4 text-slate-500" />
              <select
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Seleziona utente</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={handleTestToUser} disabled={testSending || !testUserId}>
              Invia a utente
            </Button>
            <Button variant="outline" onClick={handleTestToAdminUfficio} disabled={testSending}>
              Invia a tutti Admin e Ufficio
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

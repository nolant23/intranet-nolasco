"use client";

import { Button } from "@/components/ui/button";
import { Bell, Send } from "lucide-react";
import { usePushNotifications } from "@/lib/use-push-notifications";

export function PushNotificationsSettings() {
  const { status, message, subscribe, sendTest, isSupported, isReady } = usePushNotifications();

  if (!isReady) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-600" />
          Notifiche push
        </h2>
        <p className="text-sm text-slate-500 mt-2">Caricamento...</p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <p className="font-medium">Notifiche push non supportate</p>
        <p className="text-sm mt-1">Usa un browser moderno (Chrome, Firefox, Edge, Safari) e assicurati che il sito sia servito in HTTPS.</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="font-medium text-slate-800">Notifiche disattivate</p>
        <p className="text-sm text-slate-600 mt-1">Hai negato il permesso. Per ricevere di nuovo le notifiche, abilita il permesso nelle impostazioni del browser per questo sito.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Bell className="h-5 w-5 text-slate-600" />
        Notifiche push
      </h2>
      <p className="text-sm text-slate-600 mt-2">
        Ricevi avvisi anche quando la finestra non è aperta (es. nuovo incarico, promemoria).
      </p>

      {message && (
        <div className="mt-4 p-3 rounded-lg bg-slate-100 text-slate-800 text-sm">
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {(status === "supported" || status === "idle" || status === "loading") && (
          <Button
            type="button"
            onClick={subscribe}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            {status === "loading" ? "Attendere..." : "Abilita notifiche"}
          </Button>
        )}
        {(status === "subscribed" || status === "supported") && (
          <Button
            type="button"
            variant="outline"
            onClick={sendTest}
            className="inline-flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Invia notifica di test
          </Button>
        )}
      </div>
    </div>
  );
}

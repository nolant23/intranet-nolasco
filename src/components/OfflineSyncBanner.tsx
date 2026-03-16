"use client";

import { useOffline } from "@/contexts/OfflineContext";
import { CloudOff, RefreshCw, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineSyncBanner() {
  const { isOnline, pendingCount, isSyncing, flushQueue } = useOffline();

  if (pendingCount === 0) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 text-sm bg-amber-50 border-b border-amber-200 text-amber-900"
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            <strong>Offline.</strong> {pendingCount} {pendingCount === 1 ? "elemento" : "elementi"} in attesa di sincronizzazione. Verranno caricati quando la rete tornerà disponibile.
          </span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>Sincronizzazione in corso…</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4 shrink-0" />
          <span>
            {pendingCount} {pendingCount === 1 ? "elemento" : "elementi"} in attesa di sincronizzazione.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-amber-300 bg-white hover:bg-amber-100"
            onClick={() => flushQueue()}
          >
            Sincronizza ora
          </Button>
        </>
      )}
    </div>
  );
}

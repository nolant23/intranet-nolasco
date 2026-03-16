"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addToOfflineQueue,
  getOfflineQueue,
  getOfflineQueueCount,
  isOnline as getIsOnline,
  removeFromOfflineQueue,
  type OfflineQueueType,
} from "@/lib/offline-queue";
import { saveManutenzione } from "@/app/(dashboard)/manutenzioni/actions";
import { saveIntervento } from "@/app/(dashboard)/interventi/actions";
import {
  createVerificaBiennale,
  updateVerificaBiennale,
} from "@/app/(dashboard)/verifiche-biennali/actions";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  addToQueue: (type: OfflineQueueType, payload: Record<string, unknown>) => Promise<string>;
  refreshPendingCount: () => Promise<void>;
  flushQueue: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

function buildVerificaFormData(p: Record<string, unknown>): FormData {
  const formData = new FormData();
  formData.set("dataVerifica", String(p.dataVerifica ?? ""));
  formData.set("impiantoId", String(p.impiantoId ?? ""));
  formData.set("tecnicoId", String(p.tecnicoId ?? ""));
  formData.set("enteNotificato", String(p.enteNotificato ?? ""));
  formData.set("clienteFirmatario", String(p.clienteFirmatario ?? ""));
  formData.set("ingegnere", String(p.ingegnere ?? ""));
  formData.set("prescrizioni", String(p.prescrizioni ?? ""));
  formData.set("firmaCliente", String(p.firmaCliente ?? ""));

  const verbaleB64 = p.verbaleFileBase64 as string | undefined;
  const verbaleName = (p.verbaleFileName as string) || "verbale.pdf";
  const verbaleType = (p.verbaleFileType as string) || "application/pdf";
  if (verbaleB64 && verbaleB64.length > 0) {
    try {
      const binary = atob(verbaleB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: verbaleType });
      formData.set("verbaleFile", blob, verbaleName);
    } catch {
      // ignore invalid base64
    }
  }
  return formData;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getOfflineQueueCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    setIsOnline(getIsOnline());
    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const flushQueue = useCallback(async () => {
    if (!getIsOnline() || isSyncing) return;
    setIsSyncing(true);
    try {
      const items = await getOfflineQueue();
      for (const item of items) {
        try {
          if (item.type === "manutenzione") {
            const res = await saveManutenzione(item.payload as any);
            if (res?.success) await removeFromOfflineQueue(item.id);
          } else if (item.type === "intervento") {
            const res = await saveIntervento(item.payload as any);
            if (res?.success) await removeFromOfflineQueue(item.id);
          } else if (item.type === "verifica_biennale") {
            const formData = buildVerificaFormData(item.payload);
            const verificaId = item.payload.verificaId as string | undefined;
            const res = verificaId
              ? await updateVerificaBiennale(verificaId, formData)
              : await createVerificaBiennale(formData);
            if (res?.success) await removeFromOfflineQueue(item.id);
          }
        } catch (err) {
          console.error("[OfflineSync] Errore sincronizzazione elemento:", item.id, err);
          // lascia in coda per riprova successiva
        }
      }
      await refreshPendingCount();
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount, router]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) flushQueue();
  }, [isOnline, pendingCount, flushQueue]);

  const addToQueue = useCallback(
    async (type: OfflineQueueType, payload: Record<string, unknown>) => {
      const id = await addToOfflineQueue(type, payload);
      await refreshPendingCount();
      return id;
    },
    [refreshPendingCount]
  );

  const value: OfflineContextValue = {
    isOnline,
    pendingCount,
    isSyncing,
    addToQueue,
    refreshPendingCount,
    flushQueue,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline deve essere usato dentro OfflineProvider");
  return ctx;
}

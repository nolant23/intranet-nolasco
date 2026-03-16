"use client";

import { useState, useCallback, useEffect } from "react";
import { savePushSubscription, sendTestPush } from "@/app/(dashboard)/notifiche-push/actions";

type Status = "idle" | "loading" | "supported" | "unsupported" | "denied" | "subscribed" | "error";

export function usePushNotifications() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  /** null = non ancora noto (SSR / pre-hydration), true/false dopo useEffect */
  const [supported, setSupported] = useState<boolean | null>(null);

  const checkSupport = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!checkSupport()) {
      setSupported(false);
      setStatus("unsupported");
      return;
    }
    setSupported(true);
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("supported");
      return;
    }
    setStatus("supported");
  }, [checkSupport]);

  const subscribe = useCallback(async () => {
    if (!checkSupport()) {
      setMessage("Il browser non supporta le notifiche push.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setMessage("Permesso notifiche negato.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        setStatus("error");
        setMessage("Server: chiave VAPID non configurata.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const payload = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
        },
      };

      const result = await savePushSubscription(payload, navigator.userAgent);
      if (!result.success) {
        setStatus("error");
        setMessage(result.error ?? "Errore salvataggio.");
        return;
      }

      setStatus("subscribed");
      setMessage("Notifiche abilitate.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Errore durante l'iscrizione.");
    }
  }, [checkSupport]);

  const sendTest = useCallback(async () => {
    setMessage(null);
    const res = await sendTestPush();
    if (res.success) {
      setMessage("Notifica di test inviata. Controlla il dispositivo.");
    } else {
      setMessage(res.error ?? "Errore invio.");
    }
  }, []);

  return {
    status,
    message,
    subscribe,
    sendTest,
    isSupported: supported === true,
    /** false durante SSR e primo render client; true dopo useEffect (evita hydration mismatch) */
    isReady: supported !== null,
  };
}

async function getVapidPublicKey(): Promise<string | null> {
  const res = await fetch("/api/push/vapid");
  if (!res.ok) return null;
  const { publicKey } = await res.json();
  return publicKey ?? null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

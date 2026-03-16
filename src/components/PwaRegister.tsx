"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Aggiornamento in background: quando c'è una nuova versione, il nuovo SW attende
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Nuova versione disponibile; opzionale: mostrare banner "Aggiorna app"
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return null;
}

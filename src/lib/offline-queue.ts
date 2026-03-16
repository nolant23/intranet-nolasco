/**
 * Coda offline per manutenzioni, interventi e verifiche biennali.
 * In assenza di rete i dati vengono salvati in IndexedDB e sincronizzati quando la rete torna.
 */

const DB_NAME = "nolasco-offline-db";
const STORE_NAME = "pending-sync";
const DB_VERSION = 1;

export type OfflineQueueType = "manutenzione" | "intervento" | "verifica_biennale";

export interface OfflineQueueItem {
  id: string;
  type: OfflineQueueType;
  payload: Record<string, unknown>;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB non disponibile"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine === true;
}

/** Aggiunge un elemento alla coda (solo lato client; non chiama il server). */
export async function addToOfflineQueue(
  type: OfflineQueueType,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await openDb();
  const id = `offline-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const item: OfflineQueueItem = { id, type, payload, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Restituisce tutti gli elementi in coda. */
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Rimuove un elemento dalla coda dopo sincronizzazione riuscita. */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Numero di elementi in coda (per UI). */
export async function getOfflineQueueCount(): Promise<number> {
  const items = await getOfflineQueue();
  return items.length;
}

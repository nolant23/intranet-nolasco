"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser, sendPushToAdminAndUfficio } from "@/app/(dashboard)/notifiche-push/actions";

export type NotificationSettingRow = {
  id: string;
  eventKey: string;
  label: string;
  sendToTecnico: boolean;
  sendToAdminUfficio: boolean;
};

const DEFAULT_EVENTS: { eventKey: string; label: string }[] = [
  { eventKey: "manutenzione.created", label: "Nuova manutenzione" },
  { eventKey: "intervento.created", label: "Nuovo intervento" },
];

function ensureAdmin() {
  return async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") throw new Error("Solo gli admin possono gestire le notifiche.");
    return user;
  };
}

/** Restituisce le impostazioni notifiche (solo admin). Crea i record di default se mancanti. */
export async function getNotificationSettings(): Promise<
  { ok: true; data: { id: string; eventKey: string; label: string; sendToTecnico: boolean; sendToAdminUfficio: boolean }[] }
  | { ok: false; error: string }
> {
  try {
    await ensureAdmin()();
    let settings = await prisma.notificationSetting.findMany({ orderBy: { eventKey: "asc" } });
    if (settings.length === 0) {
      await prisma.notificationSetting.createMany({
        data: DEFAULT_EVENTS.map((e) => ({
          eventKey: e.eventKey,
          label: e.label,
          sendToTecnico: true,
          sendToAdminUfficio: true,
        })),
      });
      settings = await prisma.notificationSetting.findMany({ orderBy: { eventKey: "asc" } });
    }
    return {
      ok: true,
      data: settings.map((s) => ({
        id: s.id,
        eventKey: s.eventKey,
        label: s.label,
        sendToTecnico: s.sendToTecnico,
        sendToAdminUfficio: s.sendToAdminUfficio,
      })),
    };
  } catch (e) {
    console.error("getNotificationSettings:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Errore caricamento impostazioni" };
  }
}

/** Salva le impostazioni notifiche (solo admin). */
export async function saveNotificationSettings(
  updates: { id: string; sendToTecnico: boolean; sendToAdminUfficio: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin()();
    for (const u of updates) {
      await prisma.notificationSetting.update({
        where: { id: u.id },
        data: { sendToTecnico: u.sendToTecnico, sendToAdminUfficio: u.sendToAdminUfficio },
      });
    }
    return { success: true };
  } catch (e) {
    console.error("saveNotificationSettings:", e);
    return { success: false, error: e instanceof Error ? e.message : "Errore salvataggio" };
  }
}

/** Aggiunge un nuovo evento notifica (solo admin). eventKey es. "verifica_biennale.created" */
export async function createNotificationSetting(
  eventKey: string,
  label: string
): Promise<
  | { success: true; data: NotificationSettingRow }
  | { success: false; error: string }
> {
  try {
    await ensureAdmin()();
    const key = eventKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return { success: false, error: "Chiave evento obbligatoria" };
    const existing = await prisma.notificationSetting.findUnique({ where: { eventKey: key } });
    if (existing) return { success: false, error: "Evento già presente" };
    const created = await prisma.notificationSetting.create({
      data: { eventKey: key, label: label.trim() || key, sendToTecnico: true, sendToAdminUfficio: true },
    });
    return {
      success: true,
      data: {
        id: created.id,
        eventKey: created.eventKey,
        label: created.label,
        sendToTecnico: created.sendToTecnico,
        sendToAdminUfficio: created.sendToAdminUfficio,
      },
    };
  } catch (e) {
    console.error("createNotificationSetting:", e);
    return { success: false, error: e instanceof Error ? e.message : "Errore creazione" };
  }
}

/** Rimuove un evento notifica (solo admin). */
export async function deleteNotificationSetting(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin()();
    await prisma.notificationSetting.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("deleteNotificationSetting:", e);
    return { success: false, error: e instanceof Error ? e.message : "Errore eliminazione" };
  }
}

/** Elenco utenti per dropdown invio test (solo admin). */
export async function getUsersForNotificationTest(): Promise<
  { ok: true; data: { id: string; name: string; email: string; role: string }[] } | { ok: false; error: string }
> {
  try {
    await ensureAdmin()();
    const users = await prisma.user.findMany({
      where: { attivo: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return { ok: true, data: users };
  } catch (e) {
    console.error("getUsersForNotificationTest:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Errore caricamento utenti" };
  }
}

/** Invia notifica di test a un utente (solo admin). */
export async function sendTestPushToUser(
  userId: string,
  payload: { title: string; body?: string }
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    await ensureAdmin()();
    const result = await sendPushToUser(userId, {
      title: payload.title || "Test notifica",
      body: payload.body || "Notifica di test inviata dall'admin.",
      url: "/",
    });
    return { success: result.errors.length === 0, sent: result.sent, error: result.errors[0] };
  } catch (e) {
    console.error("sendTestPushToUser:", e);
    return { success: false, error: e instanceof Error ? e.message : "Errore invio" };
  }
}

/** Invia notifica di test a tutti Admin e Ufficio (solo admin). */
export async function sendTestPushToAdminAndUfficio(): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    await ensureAdmin()();
    const result = await sendPushToAdminAndUfficio({
      title: "Test notifica",
      body: "Notifica di test inviata dall'admin a tutti Admin e Ufficio.",
      url: "/",
    });
    return { success: true, sent: result.sent, error: result.errors[0] };
  } catch (e) {
    console.error("sendTestPushToAdminAndUfficio:", e);
    return { success: false, error: e instanceof Error ? e.message : "Errore invio" };
  }
}

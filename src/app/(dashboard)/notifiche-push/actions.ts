"use server";

import { prisma } from "@/lib/prisma";
import { sendPushNotification, type PushSubscriptionPayload } from "@/lib/web-push";
import { getCurrentUser } from "@/lib/auth";

export type SaveSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

/** Salva la subscription push dell'utente (dopo il consenso in browser). */
export async function savePushSubscription(
  subscription: PushSubscriptionPayload,
  userAgent?: string
): Promise<SaveSubscriptionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { success: false, error: "Utente non autenticato" };

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: subscription.endpoint,
        },
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Errore salvataggio subscription push:", e);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

/** Rimuove la subscription push per l'endpoint corrente. */
export async function removePushSubscription(endpoint: string): Promise<SaveSubscriptionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { success: false, error: "Non autenticato" };

    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });
    return { success: true };
  } catch (e) {
    console.error("Errore rimozione subscription:", e);
    return { success: false, error: "Errore durante la rimozione" };
  }
}

/** Invia una notifica push di test all'utente corrente. */
export async function sendTestPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { success: false, error: "Non autenticato" };

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
      take: 1,
    });

    if (subs.length === 0) {
      return { success: false, error: "Nessuna subscription attiva. Abilita le notifiche prima." };
    }

    return sendPushNotification(
      {
        endpoint: subs[0].endpoint,
        keys: { p256dh: subs[0].p256dh, auth: subs[0].auth },
      },
      { title: "Intranet Nolasco", body: "Questa è una notifica di test.", url: "/" }
    );
  } catch (e) {
    console.error("Errore invio test push:", e);
    return { success: false, error: "Errore durante l'invio" };
  }
}

/** Restituisce la chiave pubblica VAPID per il client. */
export async function getVapidPublicKey(): Promise<string | null> {
  const { getVapidPublicKey: getKey } = await import("@/lib/web-push");
  return getKey();
}

/**
 * Invia una notifica push a tutti i dispositivi registrati di un utente.
 * Usa questa funzione da altre server action (es. quando assegni una manutenzione).
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; url?: string }
): Promise<{ sent: number; errors: string[] }> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  const errors: string[] = [];
  let sent = 0;
  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    if (result.success) sent++;
    else if (result.error) errors.push(result.error);
  }
  return { sent, errors };
}

/**
 * Invia una notifica push a tutti gli utenti con ruolo ADMIN o UFFICIO
 * che hanno abilitato le notifiche. Usare per eventi come nuova manutenzione, intervento, ecc.
 */
export async function sendPushToAdminAndUfficio(
  payload: { title: string; body?: string; url?: string }
): Promise<{ sent: number; errors: string[] }> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "UFFICIO"] } },
    select: { id: true },
  });
  const errors: string[] = [];
  let sent = 0;
  for (const u of users) {
    const result = await sendPushToUser(u.id, payload);
    sent += result.sent;
    errors.push(...result.errors);
  }
  return { sent, errors };
}

/**
 * Restituisce le impostazioni per un evento (usato da manutenzioni, interventi, ecc.).
 * Se non esiste il record, restituisce { sendToTecnico: true, sendToAdminUfficio: true }.
 */
export async function getNotificationSetting(eventKey: string): Promise<{
  sendToTecnico: boolean;
  sendToAdminUfficio: boolean;
}> {
  const row = await prisma.notificationSetting.findUnique({
    where: { eventKey },
    select: { sendToTecnico: true, sendToAdminUfficio: true },
  });
  if (!row) return { sendToTecnico: true, sendToAdminUfficio: true };
  return { sendToTecnico: row.sendToTecnico, sendToAdminUfficio: row.sendToAdminUfficio };
}

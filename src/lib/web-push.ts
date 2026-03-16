/**
 * Invio notifiche push (Web Push API).
 * Richiede in .env: VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY (generare con: npx web-push generate-vapid-keys)
 */
import webpush from "web-push";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

export function isWebPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return PUBLIC_KEY || null;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: { title: string; body?: string; url?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!PRIVATE_KEY || !PUBLIC_KEY) {
    return { success: false, error: "VAPID non configurato" };
  }

  try {
    webpush.setVapidDetails("mailto:support@nolasco.it", PUBLIC_KEY, PRIVATE_KEY);

    const payloadStr = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      url: payload.url ?? "/",
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payloadStr,
      {
        TTL: 60 * 60 * 24, // 24 ore
      }
    );
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
